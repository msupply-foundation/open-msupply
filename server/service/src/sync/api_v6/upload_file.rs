use super::*;
use base64::{prelude::BASE64_STANDARD, Engine};
use repository::SyncFileReferenceRow;
use reqwest::StatusCode;
use util::https_client;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use tokio::sync::watch;

/// Chunk size for tus PATCH bodies. 4 MiB balances roundtrip overhead vs retry granularity —
/// a network blip wastes at most 4 MiB before resume picks up at the last server-acked offset.
const CHUNK_SIZE: u64 = 4 * 1024 * 1024;
const TUS_VERSION: &str = "1.0.0";

/// Result of a single `upload_file` call. The PATCH loop voluntarily yields between chunks when
/// the shared pause state is set, returning `Paused` so the caller can leave the file's state
/// alone and let the next driver tick re-enter (tus HEAD will resume from the durable server
/// offset).
#[derive(Debug, PartialEq)]
pub enum UploadOutcome {
    /// Whole file uploaded, server-side offset equals total_bytes.
    Done,
    /// Pause was observed after a successful chunk ACK; `bytes_uploaded` is the durable offset
    /// the server has on disk. Resume on the next call.
    Paused { bytes_uploaded: u64 },
}

impl SyncApiV6 {
    /// Upload a file to central using the tus 1.0.0 resumable protocol. Idempotent: on retry
    /// (or restart) it issues a HEAD against the upload URL to discover the current offset and
    /// resumes from there, so a partial upload doesn't cost the whole file's bandwidth.
    ///
    /// `pause_rx` is checked after each successful PATCH ACK; if set, the function returns
    /// `Ok(UploadOutcome::Paused { .. })` cleanly so the caller can wait for unpause and re-enter.
    /// The check happens at the only well-defined safe boundary — once the server has durably
    /// ACKed chunk N, no work is repeated on resume.
    ///
    /// `file_handle` must be openable; we read the file in chunks bounded by `CHUNK_SIZE`, so the
    /// peak memory footprint is one chunk regardless of how big the file is.
    pub async fn upload_file(
        &self,
        sync_file_reference_row: &SyncFileReferenceRow,
        file_name: &str,
        mut file_handle: File,
        pause_rx: watch::Receiver<bool>,
    ) -> Result<UploadOutcome, SyncApiErrorV6> {
        let Self {
            sync_v5_settings,
            url,
            sync_v6_version: _,
        } = self;

        let total_bytes = sync_file_reference_row.total_bytes as u64;
        let file_id = &sync_file_reference_row.id;

        let create_route = "files";
        let create_url = url.join(create_route).unwrap();
        let upload_url = url.join(&format!("files/{}", file_id)).unwrap();

        let error_with_url = |route: &str, source: SyncApiErrorVariantV6| -> SyncApiErrorV6 {
            SyncApiErrorV6 {
                url: create_url.clone(),
                route: route.to_string(),
                source,
            }
        };

        let metadata = build_upload_metadata(
            sync_v5_settings,
            file_id,
            file_name,
            &sync_file_reference_row.table_name,
            &sync_file_reference_row.record_id,
        )
        .map_err(|e| error_with_url(create_route, SyncApiErrorVariantV6::Other(e)))?;

        let client = https_client();

        // 1. Create the upload (or no-op if it already exists from a prior attempt).
        let post = client
            .post(create_url.clone())
            .header("Tus-Resumable", TUS_VERSION)
            .header("Upload-Length", total_bytes.to_string())
            .header("Upload-Metadata", &metadata)
            .send()
            .await
            .map_err(|e| error_with_url(create_route, SyncApiErrorVariantV6::ConnectionError(e)))?;

        // 201 = created; 409 = already exists from a prior attempt — both are fine, fall through
        // to HEAD which will report the actual offset on disk.
        match post.status() {
            StatusCode::CREATED | StatusCode::CONFLICT => {}
            other => {
                let body = post.text().await.unwrap_or_default();
                return Err(error_with_url(
                    create_route,
                    SyncApiErrorVariantV6::Other(anyhow::anyhow!(
                        "tus POST failed with {}: {}",
                        other,
                        body
                    )),
                ));
            }
        }

        // 2. HEAD to find current offset.
        let head_route = "files/{file_id} (HEAD)";
        let head = client
            .head(upload_url.clone())
            .header("Tus-Resumable", TUS_VERSION)
            .header("Upload-Metadata", &metadata)
            .send()
            .await
            .map_err(|e| error_with_url(head_route, SyncApiErrorVariantV6::ConnectionError(e)))?;

        if !head.status().is_success() {
            let status = head.status();
            let body = head.text().await.unwrap_or_default();
            return Err(error_with_url(
                head_route,
                SyncApiErrorVariantV6::Other(anyhow::anyhow!(
                    "tus HEAD failed with {}: {}",
                    status,
                    body
                )),
            ));
        }

        let mut offset = parse_upload_offset_header(&head)
            .map_err(|e| error_with_url(head_route, SyncApiErrorVariantV6::Other(e)))?;

        // 3. Loop chunks until the file is fully uploaded.
        let patch_route = "files/{file_id} (PATCH)";
        file_handle
            .seek(SeekFrom::Start(offset))
            .map_err(|e| error_with_url(patch_route, SyncApiErrorVariantV6::Other(e.into())))?;

        while offset < total_bytes {
            let this_chunk = ((total_bytes - offset).min(CHUNK_SIZE)) as usize;
            let mut buf = vec![0u8; this_chunk];
            file_handle
                .read_exact(&mut buf)
                .map_err(|e| error_with_url(patch_route, SyncApiErrorVariantV6::Other(e.into())))?;

            let patch = client
                .patch(upload_url.clone())
                .header("Tus-Resumable", TUS_VERSION)
                .header("Upload-Offset", offset.to_string())
                .header("Content-Type", "application/offset+octet-stream")
                .header("Upload-Metadata", &metadata)
                .body(buf)
                .send()
                .await
                .map_err(|e| {
                    error_with_url(patch_route, SyncApiErrorVariantV6::ConnectionError(e))
                })?;

            if !patch.status().is_success() {
                let status = patch.status();
                let body = patch.text().await.unwrap_or_default();
                return Err(error_with_url(
                    patch_route,
                    SyncApiErrorVariantV6::Other(anyhow::anyhow!(
                        "tus PATCH failed with {}: {}",
                        status,
                        body
                    )),
                ));
            }

            offset = parse_upload_offset_header(&patch)
                .map_err(|e| error_with_url(patch_route, SyncApiErrorVariantV6::Other(e)))?;

            log::debug!(
                "tus chunk uploaded for {file_id}: {offset}/{total_bytes} bytes ({:.1}%)",
                (offset as f64 / total_bytes as f64) * 100.0
            );

            // Pause boundary: the server has durably ACKed the chunk we just sent, so stopping
            // here means no work is repeated on resume. If the upload is complete the while
            // condition will exit naturally on the next iteration.
            if offset < total_bytes && *pause_rx.borrow() {
                log::info!("Pausing tus upload for {file_id} at {offset}/{total_bytes} bytes");
                return Ok(UploadOutcome::Paused {
                    bytes_uploaded: offset,
                });
            }
        }

        log::info!("Finished tus upload for {file_id} ({total_bytes} bytes)");
        Ok(UploadOutcome::Done)
    }
}

/// Build a tus Upload-Metadata header value. Format: `key1 base64,key2 base64,...`
fn build_upload_metadata(
    sync_v5_settings: &SyncApiSettings,
    file_id: &str,
    file_name: &str,
    table_name: &str,
    record_id: &str,
) -> Result<String, anyhow::Error> {
    let auth_json = serde_json::to_string(sync_v5_settings)?;
    let pairs = [
        ("sync_v5_settings", auth_json.as_str()),
        ("file_id", file_id),
        ("file_name", file_name),
        ("table_name", table_name),
        ("record_id", record_id),
    ];
    Ok(pairs
        .iter()
        .map(|(k, v)| format!("{} {}", k, BASE64_STANDARD.encode(v)))
        .collect::<Vec<_>>()
        .join(","))
}

fn parse_upload_offset_header(response: &reqwest::Response) -> Result<u64, anyhow::Error> {
    let value = response
        .headers()
        .get("upload-offset")
        .ok_or_else(|| anyhow::anyhow!("response missing Upload-Offset header"))?
        .to_str()
        .map_err(|e| anyhow::anyhow!("Upload-Offset is not ascii: {e}"))?;
    value
        .parse::<u64>()
        .map_err(|e| anyhow::anyhow!("Upload-Offset not a u64: {e}"))
}
