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
        let resume_from = static_file_service.resume_offset(sync_file);

        let mut request = https_client().post(url.clone()).json(&request);
        if resume_from > 0 {
            request = request.header(reqwest::header::RANGE, format!("bytes={resume_from}-"));
        }
        let result = request.send().await;

        // See the v7 equivalent: a 416 means the partial can't be continued, so discard
        // it rather than retrying the same unsatisfiable range forever.
        if matches!(&result, Ok(response) if response.status() == reqwest::StatusCode::RANGE_NOT_SATISFIABLE)
        {
            static_file_service.discard_partial_download(sync_file);
            return Err(SyncApiErrorV6 {
                url,
                route: route.to_string(),
                source: SyncApiErrorVariantV6::Other(anyhow::anyhow!(
                    "Central cannot resume sync file {} from byte {}; discarded the partial download",
                    sync_file.id,
                    resume_from
                )),
            });
        }

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

#[cfg(test)]
mod test {
    use super::*;
    use crate::sync::api::SyncApiSettings;
    use httpmock::{Method::POST, MockServer};
    use repository::sync_file_reference_row::SyncFileReferenceRow;

    fn test_settings() -> SyncApiSettings {
        SyncApiSettings {
            server_url: "http://localhost".to_string(),
            username: "site".to_string(),
            password_sha256: "hash".to_string(),
            site_uuid: "site_uuid".to_string(),
            app_version: "1.0.0".to_string(),
            app_name: "omsupply".to_string(),
            sync_version: "6".to_string(),
        }
    }

    /// 416 means central won't serve from the offset we asked for, so the partial we
    /// hoped to continue is unusable. Retrying the same range would fail identically
    /// until the row gave up, so the partial has to go.
    #[actix_rt::test]
    async fn a_range_central_cannot_satisfy_discards_the_partial() {
        let mock_server = MockServer::start();
        mock_server.mock(|when, then| {
            when.method(POST).path("/central/sync/download_file");
            then.status(416);
        });

        let temp_dir = tempfile::tempdir().unwrap();
        let mut file_service = StaticFileService::new(".").unwrap();
        file_service.dir = temp_dir.path().to_path_buf();

        let sync_file = SyncFileReferenceRow {
            id: "wedged".to_string(),
            table_name: "frontend_bundle".to_string(),
            record_id: "bundle5".to_string(),
            file_name: "frontend-dist.zip".to_string(),
            // Larger than the partial, so resume_offset hands the offset over as-is and
            // it really is the 416 handling under test.
            total_bytes: 100,
            ..Default::default()
        };

        let partial_path = file_service.partial_path(&sync_file).unwrap();
        std::fs::create_dir_all(partial_path.parent().unwrap()).unwrap();
        std::fs::write(&partial_path, "partial bytes").unwrap();
        assert_eq!(file_service.partial_download_offset(&sync_file), 13);

        let api = SyncApiV6::new(&mock_server.base_url(), &test_settings(), 6).unwrap();
        assert!(api.download_file(&file_service, &sync_file).await.is_err());

        // Gone, so the next attempt starts from zero instead of asking for the same
        // unsatisfiable range forever.
        assert_eq!(file_service.partial_download_offset(&sync_file), 0);
    }
}
