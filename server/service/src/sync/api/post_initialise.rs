use super::*;

impl SyncApiV5 {
    // Request remote sync queue (re)initialisation (initial sync, or re-initialising a data file).
    // Central generates the queue asynchronously and responds 202 (older central: 200). We ignore the
    // body and just confirm the POST was accepted; the caller polls /sync/v5/site for progress.
    pub(crate) async fn post_initialise(&self) -> Result<(), SyncApiError> {
        let route = "/sync/v5/initialise";
        self.do_empty_post(route).await?;
        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use httpmock::{Method::POST, MockServer};

    // New central: 202 Accepted with an initialisationStatus body (body ignored, status is what matters).
    #[actix_rt::test]
    async fn test_initialise_accepts_202() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(POST).path("/sync/v5/initialise");
            then.status(202).body(
                r#"{
                    "initialisationStatus": "started"
                }"#,
            );
        });

        let result = create_api(&url, "", "").post_initialise().await;

        mock.assert();

        assert!(result.is_ok());
    }

    #[actix_rt::test]
    async fn test_initialise_accepts_legacy_200() {
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

        assert!(result.is_ok());
    }
}
