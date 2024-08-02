use serde::{Deserialize, Serialize};

use super::*;
#[derive(Debug, Deserialize, Serialize, PartialEq)]
pub(crate) struct RemotePushResponseV5 {
    #[serde(rename = "integrationStarted")]
    pub(crate) integration_started: bool,
}

impl SyncApiV5 {
    // Post records to central server
    pub(crate) async fn post_queued_records(
        &self,
        // Remaining number of records to push
        queue_length: u64,
        records: Vec<RemoteSyncRecordV5>,
    ) -> Result<RemotePushResponseV5, SyncApiError> {
        let route = "/sync/v5/queued_records";
        let body = RemoteSyncBatchV5 {
            queue_length,
            data: records,
        };

        let response = self.do_post(route, &body).await?;

        to_json(response)
            .await
            .map_err(|error| self.api_error(route, error.into()))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use httpmock::{Method::POST, MockServer};
    use serde_json::json;

    #[actix_rt::test]
    async fn test_post_queued_records() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(POST)
                .body(r#"{"queueLength":0,"data":[{"syncOutId":"ID1","tableName":"test_table_name","recordId":"ID2","action":"insert","recordData":{"test_key":"test_value"}}]}"#)
                .path("/sync/v5/queued_records");
            then.status(200).body(
                r#"{
                "integrationStarted": true
            }"#,
            );
        });

        let result = create_api(&url, "", "")
            .post_queued_records(
                0,
                vec![RemoteSyncRecordV5 {
                    sync_id: "ID1".to_string(),
                    record: CommonSyncRecord {
                        table_name: "test_table_name".to_string(),
                        record_id: "ID2".to_string(),
                        action: SyncAction::Insert,
                        record_data: json!({"test_key": "test_value"}),
                    },
                }],
            )
            .await;

        mock.assert();

        assert!(result.is_ok());

        assert_eq!(
            result.unwrap(),
            RemotePushResponseV5 {
                integration_started: true
            }
        );
    }
}
