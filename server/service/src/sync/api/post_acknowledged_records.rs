use serde::Serialize;

use super::*;

#[derive(Debug, Serialize)]
pub(crate) struct RemoteSyncPullAcknowledgementV5 {
    #[serde(rename = "syncIDs")]
    pub(crate) sync_ids: Vec<String>,
}

impl SyncApiV5 {
    // Acknowledge successful integration of records from sync queue.
    pub(crate) async fn post_acknowledged_records(
        &self,
        sync_ids: Vec<String>,
    ) -> Result<(), SyncApiError> {
        self.do_post(
            "/sync/v5/acknowledged_records",
            &RemoteSyncPullAcknowledgementV5 { sync_ids },
        )
        .await?;

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use httpmock::{Method::POST, MockServer};

    #[actix_rt::test]
    async fn test_acknowledged_remote_records() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(POST)
                .body(r#"{"syncIDs":["ONE","TWO"]}"#)
                .path("/sync/v5/acknowledged_records");
            then.status(204);
        });

        let result = create_api(&url, "", "")
            .post_acknowledged_records(vec!["ONE".to_string(), "TWO".to_string()])
            .await;

        mock.assert();

        assert!(result.is_ok());
    }
}
