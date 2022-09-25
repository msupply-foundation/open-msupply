use super::*;

impl SyncApiV5 {
    // Initialize remote sync queue.
    // Should only be called on initial sync or when re-initializing an existing data file.
    pub(crate) async fn post_initialise(&self) -> Result<RemoteSyncBatchV5, SyncApiError> {
        let response = self.do_empty_post("/sync/v5/initialise").await?;

        to_json(response)
            .await
            .map_err(SyncApiError::ResponseParsingError)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use httpmock::{Method::POST, MockServer};
    use util::assert_matches;

    #[actix_rt::test]
    async fn test_initialise_remote_records() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(POST).path("/sync/v5/initialise");
            then.status(200).body(
                r#"{
                    "queueLength": 2264
                }"#,
            );
        });

        let result = create_api(&url, "", "").post_initialise().await;

        mock.assert();

        assert_matches!(result, Ok(_));
    }
}
