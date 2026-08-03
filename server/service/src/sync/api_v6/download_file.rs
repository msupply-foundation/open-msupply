use super::*;
use crate::static_files::{StaticFile, StaticFileService};
use repository::sync_file_reference_row::SyncFileReferenceRow;
use reqwest::Response;
use util::https_client;

impl SyncApiV6 {
    pub async fn download_file(
        &self,
        static_file_service: &StaticFileService,
        sync_file: &SyncFileReferenceRow,
    ) -> Result<StaticFile, SyncApiErrorV6> {
        let Self {
            sync_v5_settings,
            url,
            sync_v6_version,
        } = self;

        let route = "download_file";
        let url = url.join(route).unwrap();

        let request = SyncDownloadFileRequestV6 {
            id: sync_file.id.clone(),
            table_name: sync_file.table_name.clone(),
            record_id: sync_file.record_id.clone(),
            sync_v5_settings: sync_v5_settings.clone(),
            sync_v6_version: *sync_v6_version,
        };

        // Resume from an earlier partial download; see the v7 equivalent for why this
        // needs nothing on the central side.
        let resume_from = static_file_service.partial_download_offset(sync_file);

        let mut request = https_client().post(url.clone()).json(&request);
        if resume_from > 0 {
            request = request.header(reqwest::header::RANGE, format!("bytes={resume_from}-"));
        }
        let result = request.send().await;

        let downloaded_file = match download_response_or_err(result).await {
            Err(error) => Err(error),
            Ok(download_response) => static_file_service
                .download_file_in_chunks(sync_file, download_response, resume_from)
                .await
                .map(|(file, _bytes)| file)
                .map_err(SyncApiErrorVariantV6::Other),
        }
        .map_err(|source| SyncApiErrorV6 {
            url,
            route: route.to_string(),
            source,
        })?;

        Ok(downloaded_file)
    }
}

// This maps differently as we check for successful status and pass on response
async fn download_response_or_err(
    result: Result<Response, reqwest::Error>,
) -> Result<Response, SyncApiErrorVariantV6> {
    let response = match result {
        Ok(result) => result,
        Err(error) => {
            if error.is_connect() {
                return Err(SyncApiErrorVariantV6::ConnectionError(error));
            } else {
                return Err(SyncApiErrorVariantV6::Other(error.into()));
            }
        }
    };

    if response.status().is_success() {
        return Ok(response);
    }

    // Parse error
    let response_text = response
        .text()
        .await
        .map_err(ParsingResponseError::CannotGetTextResponse)?;

    let error = serde_json::from_str::<SyncParsedErrorV6>(&response_text).map_err(|source| {
        ParsingResponseError::ParseError {
            source,
            response_text,
        }
    })?;

    Err(error.into())
}
