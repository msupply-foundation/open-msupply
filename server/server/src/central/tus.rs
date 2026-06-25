//! Tus 1.0.0 resumable file upload protocol — https://tus.io/protocols/resumable-upload
//!
//! Mounted under `/central/sync/files`. Replaces the legacy `/central/sync/upload_file` route.
//! Supports the `creation` extension; intermediate uploads carry auth via `Upload-Metadata` on
//! every request (HEAD and PATCH included) since this is server-to-server traffic with no session.
//!
//! Endpoints:
//! - `OPTIONS /central/sync/files` — advertise protocol support
//! - `POST    /central/sync/files` — create an upload session for a known file_id
//! - `HEAD    /central/sync/files/{file_id}` — report current Upload-Offset
//! - `PATCH   /central/sync/files/{file_id}` — append bytes at the given offset
//!
//! Upload-Metadata pairs we expect:
//! - `sync_v5_settings` — base64 of the SyncApiSettings JSON (required on every request, for auth)
//! - `file_id`, `table_name`, `record_id`, `file_name` — required on POST when the
//!   sync_file_reference row hasn't yet synced from the remote (we'll create a stop-gap row).

use std::{collections::HashMap, fmt::Display};

use actix_web::{
    dev::HttpServiceFactory,
    head,
    http::{header::HeaderMap, StatusCode},
    options, patch, post,
    web::{self, Bytes, Data, Payload},
    HttpRequest, HttpResponse, ResponseError,
};
use base64::{prelude::BASE64_STANDARD, Engine};
use chrono::Utc;
use futures::StreamExt;
use repository::{
    SyncFileDirection, SyncFileReferenceRow, SyncFileReferenceRowRepository, SyncFileStatus,
};
use serde::Deserialize;
use service::{
    service_provider::{ServiceContext, ServiceProvider},
    settings::Settings,
    static_files::{StaticFileCategory, StaticFileService},
    sync::{
        api::{validate_site_auth, SyncApiSettings},
        CentralServerConfig,
    },
};
use tokio::io::AsyncWriteExt;

const TUS_VERSION: &str = "1.0.0";
const TUS_EXTENSIONS: &str = "creation";
/// Soft cap reported to clients. We don't enforce it in PATCH — the per-file row carries the
/// real total_bytes — but advertising helps client-side validation.
const TUS_MAX_SIZE: u64 = 10 * 1024 * 1024 * 1024; // 10 GiB

pub fn tus_on_central() -> impl HttpServiceFactory {
    web::scope("files")
        .service(options)
        .service(create)
        .service(head_offset)
        .service(patch_chunk)
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

#[options("")]
async fn options() -> HttpResponse {
    HttpResponse::NoContent()
        .insert_header(("Tus-Resumable", TUS_VERSION))
        .insert_header(("Tus-Version", TUS_VERSION))
        .insert_header(("Tus-Extension", TUS_EXTENSIONS))
        .insert_header(("Tus-Max-Size", TUS_MAX_SIZE.to_string()))
        .finish()
}

#[post("")]
async fn create(
    req: HttpRequest,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
) -> Result<HttpResponse, TusError> {
    require_tus_resumable(req.headers())?;
    require_central()?;

    let upload_length = parse_upload_length(req.headers())?;
    let metadata = parse_metadata(req.headers())?;
    let auth_settings = decode_sync_v5_settings(&metadata)?;

    let ctx = service_provider.basic_context().map_err(internal)?;
    validate_site_auth(&ctx, &auth_settings)
        .await
        .map_err(|_| TusError::Unauthorized)?;

    let file_id = require_metadata(&metadata, "file_id")?;

    let repo = SyncFileReferenceRowRepository::new(&ctx.connection);
    let sync_file_reference = match repo.find_one_by_id(&file_id).map_err(internal)? {
        Some(row) => {
            // Row already synced from remote — total_bytes must match the client's claim
            if row.total_bytes as u64 != upload_length {
                return Err(TusError::BadRequest(format!(
                    "Upload-Length ({}) does not match sync_file_reference.total_bytes ({})",
                    upload_length, row.total_bytes
                )));
            }
            row
        }
        None => create_stopgap_row(&ctx, &metadata, upload_length, &file_id)?,
    };

    let file_service = StaticFileService::new(&settings.server.base_dir).map_err(internal)?;
    let category = StaticFileCategory::SyncFile(
        sync_file_reference.table_name.clone(),
        sync_file_reference.record_id.clone(),
    );
    let file = file_service
        .reserve_file(
            &sync_file_reference.file_name,
            &category,
            Some(file_id.clone()),
        )
        .map_err(internal)?;

    // Create an empty file at the reserved path — subsequent PATCHes will append to it.
    // If a partial file already exists from a previous abandoned upload at the same file_id,
    // we keep it: HEAD will report its current size and the client resumes from there.
    if !std::path::Path::new(&file.path).exists() {
        std::fs::File::create(&file.path).map_err(internal)?;
    }

    Ok(HttpResponse::Created()
        .insert_header(("Tus-Resumable", TUS_VERSION))
        .insert_header(("Location", format!("/central/sync/files/{}", file_id)))
        .finish())
}

#[head("/{file_id}")]
async fn head_offset(
    req: HttpRequest,
    path: web::Path<String>,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
) -> Result<HttpResponse, TusError> {
    require_tus_resumable(req.headers())?;
    require_central()?;

    let metadata = parse_metadata(req.headers())?;
    let auth_settings = decode_sync_v5_settings(&metadata)?;

    let ctx = service_provider.basic_context().map_err(internal)?;
    validate_site_auth(&ctx, &auth_settings)
        .await
        .map_err(|_| TusError::Unauthorized)?;

    let file_id = path.into_inner();
    let repo = SyncFileReferenceRowRepository::new(&ctx.connection);
    let row = repo
        .find_one_by_id(&file_id)
        .map_err(internal)?
        .ok_or_else(|| TusError::NotFound(file_id.clone()))?;

    let offset = current_offset(&settings, &row, &file_id)?;

    Ok(HttpResponse::Ok()
        .insert_header(("Tus-Resumable", TUS_VERSION))
        .insert_header(("Upload-Offset", offset.to_string()))
        .insert_header(("Upload-Length", row.total_bytes.to_string()))
        .insert_header(("Cache-Control", "no-store"))
        .finish())
}

#[patch("/{file_id}")]
async fn patch_chunk(
    req: HttpRequest,
    path: web::Path<String>,
    settings: Data<Settings>,
    service_provider: Data<ServiceProvider>,
    mut body: Payload,
) -> Result<HttpResponse, TusError> {
    require_tus_resumable(req.headers())?;
    require_central()?;
    require_header_value(
        req.headers(),
        "content-type",
        "application/offset+octet-stream",
    )?;

    let client_offset = parse_upload_offset(req.headers())?;
    let metadata = parse_metadata(req.headers())?;
    let auth_settings = decode_sync_v5_settings(&metadata)?;

    let ctx = service_provider.basic_context().map_err(internal)?;
    validate_site_auth(&ctx, &auth_settings)
        .await
        .map_err(|_| TusError::Unauthorized)?;

    let file_id = path.into_inner();
    let repo = SyncFileReferenceRowRepository::new(&ctx.connection);
    let row = repo
        .find_one_by_id(&file_id)
        .map_err(internal)?
        .ok_or_else(|| TusError::NotFound(file_id.clone()))?;

    let file_service = StaticFileService::new(&settings.server.base_dir).map_err(internal)?;
    let category = StaticFileCategory::SyncFile(row.table_name.clone(), row.record_id.clone());
    let file = file_service
        .reserve_file(&row.file_name, &category, Some(file_id.clone()))
        .map_err(internal)?;

    // The file is expected to exist (created at POST). If absent — e.g. someone PATCHed without
    // POSTing first, or the server was restarted with a wiped base_dir — refuse rather than
    // silently re-create with the wrong offset.
    let server_offset = match std::fs::metadata(&file.path) {
        Ok(m) => m.len(),
        Err(_) => {
            return Err(TusError::NotFound(format!(
                "no partial file for {} — POST first",
                file_id
            )))
        }
    };

    if server_offset != client_offset {
        return Err(TusError::Conflict(format!(
            "Upload-Offset {} does not match server offset {}",
            client_offset, server_offset
        )));
    }

    // Append the streaming body. Per-chunk RAM is bounded by the underlying TCP chunk size.
    let mut handle = tokio::fs::OpenOptions::new()
        .append(true)
        .open(&file.path)
        .await
        .map_err(internal)?;

    let mut written: u64 = 0;
    while let Some(chunk) = body.next().await {
        let chunk: Bytes = chunk.map_err(|e| TusError::BadRequest(format!("payload error: {e}")))?;
        handle.write_all(&chunk).await.map_err(internal)?;
        written += chunk.len() as u64;
    }
    handle.flush().await.map_err(internal)?;
    drop(handle);

    let new_offset = client_offset + written;

    // Cap at total_bytes — a buggy client could send more than promised.
    if new_offset > row.total_bytes as u64 {
        return Err(TusError::BadRequest(format!(
            "received {} bytes but Upload-Length is {}",
            new_offset, row.total_bytes
        )));
    }

    // When the file is complete, mirror the legacy handler's behaviour: set local uploaded_bytes
    // without producing a changelog. The remote's terminal status (Done) is the source of truth
    // and reaches central via the regular sync push.
    if new_offset == row.total_bytes as u64 {
        repo.upsert_without_changelog(&SyncFileReferenceRow {
            uploaded_bytes: row.total_bytes,
            ..row
        })
        .map_err(internal)?;
    }

    Ok(HttpResponse::NoContent()
        .insert_header(("Tus-Resumable", TUS_VERSION))
        .insert_header(("Upload-Offset", new_offset.to_string()))
        .finish())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn require_central() -> Result<(), TusError> {
    if !CentralServerConfig::is_central_server() {
        return Err(TusError::Forbidden("not a central server".into()));
    }
    Ok(())
}

fn require_tus_resumable(headers: &HeaderMap) -> Result<(), TusError> {
    match headers.get("tus-resumable").and_then(|v| v.to_str().ok()) {
        Some(v) if v == TUS_VERSION => Ok(()),
        Some(other) => Err(TusError::PreconditionFailed(format!(
            "unsupported Tus-Resumable: {}",
            other
        ))),
        None => Err(TusError::BadRequest("missing Tus-Resumable header".into())),
    }
}

fn require_header_value(
    headers: &HeaderMap,
    name: &str,
    expected: &str,
) -> Result<(), TusError> {
    match headers.get(name).and_then(|v| v.to_str().ok()) {
        Some(v) if v.eq_ignore_ascii_case(expected) => Ok(()),
        _ => Err(TusError::BadRequest(format!(
            "expected {name}: {expected}"
        ))),
    }
}

fn parse_upload_length(headers: &HeaderMap) -> Result<u64, TusError> {
    headers
        .get("upload-length")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok())
        .ok_or_else(|| TusError::BadRequest("missing or invalid Upload-Length".into()))
}

fn parse_upload_offset(headers: &HeaderMap) -> Result<u64, TusError> {
    headers
        .get("upload-offset")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok())
        .ok_or_else(|| TusError::BadRequest("missing or invalid Upload-Offset".into()))
}

/// Parse a tus Upload-Metadata header. Format: `key1 b64value1,key2 b64value2,...` (the value is
/// optional for some keys per the spec, but for our purposes every key carries a base64 value).
fn parse_metadata(headers: &HeaderMap) -> Result<HashMap<String, String>, TusError> {
    let raw = headers
        .get("upload-metadata")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    let mut out = HashMap::new();
    if raw.is_empty() {
        return Ok(out);
    }
    for pair in raw.split(',') {
        let pair = pair.trim();
        if pair.is_empty() {
            continue;
        }
        let mut parts = pair.splitn(2, ' ');
        let key = parts
            .next()
            .ok_or_else(|| TusError::BadRequest("malformed Upload-Metadata pair".into()))?
            .to_string();
        let b64 = parts.next().unwrap_or("");
        let decoded = BASE64_STANDARD
            .decode(b64)
            .map_err(|e| TusError::BadRequest(format!("base64 decode failed for {key}: {e}")))?;
        let value = String::from_utf8(decoded).map_err(|e| {
            TusError::BadRequest(format!("metadata value for {key} is not utf-8: {e}"))
        })?;
        out.insert(key, value);
    }
    Ok(out)
}

fn require_metadata(meta: &HashMap<String, String>, key: &str) -> Result<String, TusError> {
    meta.get(key)
        .cloned()
        .ok_or_else(|| TusError::BadRequest(format!("missing Upload-Metadata key: {key}")))
}

fn decode_sync_v5_settings(
    meta: &HashMap<String, String>,
) -> Result<SyncApiSettings, TusError> {
    let json = require_metadata(meta, "sync_v5_settings")?;
    serde_json::from_str::<SyncApiSettings>(&json).map_err(|e| {
        TusError::BadRequest(format!("sync_v5_settings JSON parse failed: {e}"))
    })
}

/// When the file_reference row hasn't yet synced from the remote we still want the upload to
/// proceed — record-id, table-name, file-name come from Upload-Metadata. The row is written via
/// `upsert_without_changelog` so it stays local; the proper row arrives via sync later and is
/// merged (preserving our local-only fields).
fn create_stopgap_row(
    ctx: &ServiceContext,
    meta: &HashMap<String, String>,
    upload_length: u64,
    file_id: &str,
) -> Result<SyncFileReferenceRow, TusError> {
    let table_name = require_metadata(meta, "table_name")?;
    let record_id = require_metadata(meta, "record_id")?;
    let file_name = require_metadata(meta, "file_name")?;

    let row = SyncFileReferenceRow {
        id: file_id.to_string(),
        file_name,
        table_name,
        record_id,
        uploaded_bytes: 0,
        downloaded_bytes: 0,
        total_bytes: upload_length as i32,
        status: SyncFileStatus::New,
        error: None,
        mime_type: None,
        retries: 0,
        retry_at: None,
        direction: SyncFileDirection::Upload,
        created_datetime: Utc::now().naive_utc(),
        deleted_datetime: None,
    };
    SyncFileReferenceRowRepository::new(&ctx.connection)
        .upsert_without_changelog(&row)
        .map_err(internal)?;
    Ok(row)
}

fn current_offset(
    settings: &Settings,
    row: &SyncFileReferenceRow,
    file_id: &str,
) -> Result<u64, TusError> {
    let file_service =
        StaticFileService::new(&settings.server.base_dir).map_err(internal)?;
    let category =
        StaticFileCategory::SyncFile(row.table_name.clone(), row.record_id.clone());
    let file = file_service
        .reserve_file(&row.file_name, &category, Some(file_id.to_string()))
        .map_err(internal)?;
    match std::fs::metadata(&file.path) {
        Ok(m) => Ok(m.len()),
        Err(_) => Ok(0),
    }
}

fn internal<E: Display>(e: E) -> TusError {
    TusError::Internal(e.to_string())
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub enum TusError {
    BadRequest(String),
    Unauthorized,
    Forbidden(String),
    NotFound(String),
    Conflict(String),
    PreconditionFailed(String),
    Internal(String),
}

impl Display for TusError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TusError::BadRequest(m) => write!(f, "{m}"),
            TusError::Unauthorized => write!(f, "unauthorized"),
            TusError::Forbidden(m) => write!(f, "{m}"),
            TusError::NotFound(m) => write!(f, "{m}"),
            TusError::Conflict(m) => write!(f, "{m}"),
            TusError::PreconditionFailed(m) => write!(f, "{m}"),
            TusError::Internal(m) => write!(f, "{m}"),
        }
    }
}

impl ResponseError for TusError {
    fn status_code(&self) -> StatusCode {
        match self {
            TusError::BadRequest(_) => StatusCode::BAD_REQUEST,
            TusError::Unauthorized => StatusCode::UNAUTHORIZED,
            TusError::Forbidden(_) => StatusCode::FORBIDDEN,
            TusError::NotFound(_) => StatusCode::NOT_FOUND,
            TusError::Conflict(_) => StatusCode::CONFLICT,
            TusError::PreconditionFailed(_) => StatusCode::PRECONDITION_FAILED,
            TusError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code())
            .insert_header(("Tus-Resumable", TUS_VERSION))
            .body(self.to_string())
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::http::header::{HeaderName, HeaderValue};

    fn header(pairs: &[(&str, &str)]) -> HeaderMap {
        let mut map = HeaderMap::new();
        for (name, value) in pairs {
            map.insert(
                HeaderName::from_bytes(name.as_bytes()).unwrap(),
                HeaderValue::from_str(value).unwrap(),
            );
        }
        map
    }

    #[test]
    fn parse_metadata_handles_multiple_pairs() {
        let headers = header(&[(
            "upload-metadata",
            // file_id=abc, file_name=hello.bin (base64)
            "file_id YWJj,file_name aGVsbG8uYmlu",
        )]);
        let parsed = parse_metadata(&headers).unwrap();
        assert_eq!(parsed.get("file_id"), Some(&"abc".to_string()));
        assert_eq!(parsed.get("file_name"), Some(&"hello.bin".to_string()));
    }

    #[test]
    fn parse_metadata_handles_missing_header() {
        let headers = HeaderMap::new();
        let parsed = parse_metadata(&headers).unwrap();
        assert!(parsed.is_empty());
    }

    #[test]
    fn parse_metadata_rejects_bad_base64() {
        let headers = header(&[("upload-metadata", "file_id !!!not-base64!!!")]);
        let result = parse_metadata(&headers);
        assert!(matches!(result, Err(TusError::BadRequest(_))));
    }

    #[test]
    fn parse_upload_length_ok() {
        let headers = header(&[("upload-length", "12345")]);
        assert_eq!(parse_upload_length(&headers).unwrap(), 12345);
    }

    #[test]
    fn parse_upload_length_rejects_non_numeric() {
        let headers = header(&[("upload-length", "abc")]);
        assert!(matches!(
            parse_upload_length(&headers),
            Err(TusError::BadRequest(_))
        ));
    }

    #[test]
    fn parse_upload_offset_ok() {
        let headers = header(&[("upload-offset", "0")]);
        assert_eq!(parse_upload_offset(&headers).unwrap(), 0);
        let headers = header(&[("upload-offset", "4194304")]);
        assert_eq!(parse_upload_offset(&headers).unwrap(), 4194304);
    }

    #[test]
    fn require_tus_resumable_accepts_correct_version() {
        let headers = header(&[("tus-resumable", "1.0.0")]);
        assert!(require_tus_resumable(&headers).is_ok());
    }

    #[test]
    fn require_tus_resumable_rejects_other_version() {
        let headers = header(&[("tus-resumable", "0.9.0")]);
        assert!(matches!(
            require_tus_resumable(&headers),
            Err(TusError::PreconditionFailed(_))
        ));
    }

    #[test]
    fn require_tus_resumable_rejects_missing() {
        let headers = HeaderMap::new();
        assert!(matches!(
            require_tus_resumable(&headers),
            Err(TusError::BadRequest(_))
        ));
    }

    #[test]
    fn require_header_value_is_case_insensitive() {
        let headers = header(&[("content-type", "Application/Offset+Octet-Stream")]);
        assert!(require_header_value(
            &headers,
            "content-type",
            "application/offset+octet-stream"
        )
        .is_ok());
    }

    #[test]
    fn tus_error_response_includes_resumable_header() {
        let err = TusError::Conflict("offset 0 vs 100".to_string());
        let response = err.error_response();
        assert_eq!(response.status(), StatusCode::CONFLICT);
        assert_eq!(
            response.headers().get("Tus-Resumable").unwrap(),
            HeaderValue::from_static(TUS_VERSION)
        );
    }
}
