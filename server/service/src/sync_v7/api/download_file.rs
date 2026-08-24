use repository::{syncv7::SyncError, SyncFileReferenceRow};
use serde::{Deserialize, Serialize};
use util::{format_error, with_retries, RetrySeconds};

use super::SyncApiV7;
use crate::static_files::{StaticFile, StaticFileService};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Input {
    pub id: String,
    pub table_name: String,
    pub record_id: String,
}

static ROUTE: &str = "download_file";

impl SyncApiV7 {
    /// Download file bytes from central, streaming them into local static file storage.
    /// Unlike the JSON `op` endpoints, a success response here is a raw byte stream;
    /// errors come back as a non-2xx status with a JSON-serialized `SyncError` body.
    pub async fn download_file(
        &self,
        static_file_service: &StaticFileService,
        sync_file: &SyncFileReferenceRow,
    ) -> Result<StaticFile, SyncError> {
        let url = self
            .url
            .join("central/sync_v7/")
            .unwrap()
            .join(ROUTE)
            .unwrap();

        let input = Input {
            id: sync_file.id.clone(),
            table_name: sync_file.table_name.clone(),
            record_id: sync_file.record_id.clone(),
        };
        let auth_headers = self.auth_headers.clone();

        // Resume where a previous attempt left off. Central serves the file through
        // actix's NamedFile, which honours `Range` and answers 206 — so resuming needs
        // nothing on the central side. A central that ignored the header would answer
        // 200 with the whole file, which download_file_in_chunks handles by starting
        // over rather than corrupting the partial.
        let resume_from = static_file_service.partial_download_offset(sync_file);
        let range = (resume_from > 0).then(|| format!("bytes={resume_from}-"));

        let result = with_retries(RetrySeconds::default(), |client| {
            let request = client
                .post(url.clone())
                .headers(auth_headers.clone())
                .json(&input);
            match &range {
                Some(range) => request.header(reqwest::header::RANGE, range),
                None => request,
            }
        })
        .await;

        let response = match result {
            Ok(response) => response,
            Err(error) => {
                let formatted_error = format_error(&error);
                if error.is_connect() {
                    return Err(SyncError::ConnectionError {
                        url: url.to_string(),
                        e: formatted_error,
                    });
                }
                return Err(SyncError::Other(formatted_error));
            }
        };

        // Central won't serve from the offset we asked for. Either we already hold the
        // whole file and only the rename was missed, or the partial is unusable — see
        // `resolve_unsatisfiable_range`. Both beat asking for the same range forever.
        if response.status() == reqwest::StatusCode::RANGE_NOT_SATISFIABLE {
            return static_file_service
                .resolve_unsatisfiable_range(sync_file, &response)
                .map(|(file, _bytes)| file)
                .map_err(|e| SyncError::Other(format!("{e:#}")));
        }

        if !response.status().is_success() {
            let response_text = response
                .text()
                .await
                .map_err(|e| SyncError::Other(format_error(&e)))?;

            let error = serde_json::from_str::<SyncError>(&response_text).unwrap_or_else(|e| {
                SyncError::ParsingError {
                    e: format_error(&e),
                    response_text,
                }
            });
            return Err(error);
        }

        static_file_service
            .download_file_in_chunks(sync_file, response, resume_from)
            .await
            .map(|(file, _bytes)| file)
            .map_err(|e| SyncError::Other(format!("Failed to store downloaded file: {e:#}")))
    }
}
