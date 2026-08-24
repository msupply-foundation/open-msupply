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

        // See `resolve_unsatisfiable_range`: a 416 means either that we already hold the
        // whole file, or that the partial can't be continued. Never that we should ask
        // for the same range again.
        if let Ok(response) = &result {
            if response.status() == reqwest::StatusCode::RANGE_NOT_SATISFIABLE {
                return static_file_service
                    .resolve_unsatisfiable_range(sync_file, response)
                    .map(|(file, _bytes)| file)
                    .map_err(|source| SyncApiErrorV6 {
                        url,
                        route: route.to_string(),
                        source: SyncApiErrorVariantV6::Other(source),
                    });
            }
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
    use crate::static_files::StaticFileCategory;
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

    fn sync_file(id: &str) -> SyncFileReferenceRow {
        SyncFileReferenceRow {
            id: id.to_string(),
            table_name: "frontend_bundle".to_string(),
            record_id: "bundle5".to_string(),
            file_name: "frontend-dist.zip".to_string(),
            total_bytes: 100,
            ..Default::default()
        }
    }

    /// Plant a part-downloaded file and answer the resume request with a 416 carrying the
    /// given complete length, the way actix's `NamedFile` does.
    async fn download_against_416(
        id: &str,
        partial: &str,
        content_range: Option<&str>,
    ) -> (StaticFileService, SyncFileReferenceRow, anyhow::Result<()>) {
        let mock_server = MockServer::start();
        mock_server.mock(|when, then| {
            when.method(POST).path("/central/sync/download_file");
            match content_range {
                Some(value) => then.status(416).header("Content-Range", value),
                None => then.status(416),
            };
        });

        let temp_dir = tempfile::tempdir().unwrap();
        let mut file_service = StaticFileService::new(".").unwrap();
        // Outlives the TempDir guard being dropped, since the assertions only read
        // lengths through the service.
        file_service.dir = temp_dir.keep();

        let sync_file = sync_file(id);
        let partial_path = file_service.partial_path(&sync_file).unwrap();
        std::fs::create_dir_all(partial_path.parent().unwrap()).unwrap();
        std::fs::write(&partial_path, partial).unwrap();
        assert_eq!(
            file_service.partial_download_offset(&sync_file),
            partial.len() as u64
        );

        let api = SyncApiV6::new(&mock_server.base_url(), &test_settings(), 6).unwrap();
        let result = api
            .download_file(&file_service, &sync_file)
            .await
            .map(|_| ())
            .map_err(anyhow::Error::from);

        (file_service, sync_file, result)
    }

    /// The partial holds every byte central has: the download did finish, and only the
    /// rename was missed because the process died in that window. Re-fetching a bundle we
    /// already hold in full is exactly the waste this path exists to avoid, so the file is
    /// completed where it stands.
    #[actix_rt::test]
    async fn a_complete_partial_is_finished_rather_than_re_downloaded() {
        let (file_service, sync_file, result) =
            download_against_416("already_complete", "partial bytes", Some("bytes */13")).await;

        assert!(result.is_ok(), "expected success, got {:?}", result.err());

        // Findable under its final name, with the bytes we already had…
        let category =
            StaticFileCategory::SyncFile(sync_file.table_name.clone(), sync_file.record_id.clone());
        let found = file_service
            .find_file(&sync_file.id, category)
            .unwrap()
            .expect("file should be findable");
        assert_eq!(
            std::fs::read_to_string(&found.path).unwrap(),
            "partial bytes"
        );

        // …and no partial left to resume.
        assert_eq!(file_service.partial_download_offset(&sync_file), 0);
    }

    /// Central holds fewer bytes than we do, so what we have can't be a prefix of the
    /// file. Nothing to salvage: discard and start over.
    #[actix_rt::test]
    async fn a_partial_longer_than_the_file_is_discarded() {
        let (file_service, sync_file, result) =
            download_against_416("too_long", "partial bytes", Some("bytes */5")).await;

        assert!(result.is_err());
        assert_eq!(file_service.partial_download_offset(&sync_file), 0);
    }

    /// Without a usable `Content-Range` there is no evidence the bytes are complete, so
    /// the safe reading is that they aren't.
    #[actix_rt::test]
    async fn a_416_without_a_length_discards_the_partial() {
        let (file_service, sync_file, result) =
            download_against_416("no_header", "partial bytes", None).await;

        assert!(result.is_err());
        assert_eq!(file_service.partial_download_offset(&sync_file), 0);
    }
}
