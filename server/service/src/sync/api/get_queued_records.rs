use super::*;

impl SyncApiV5 {
    // Get batch of records from remote sync queue.
    pub(crate) async fn get_queued_records(
        &self,
        batch_size: u32,
    ) -> Result<RemoteSyncBatchV5, SyncApiError> {
        let route = "/sync/v5/queued_records";
        let query = [("limit", &batch_size.to_string())];
        let response = self.do_get(route, &query).await?;

        to_json(response)
            .await
            .map_err(|error| self.api_error(route, error.into()))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use httpmock::{Method::GET, MockServer};
    use serde_json::json;

    #[actix_rt::test]
    async fn test_get_queued_records() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(GET)
                .query_param("limit", "2")
                .path("/sync/v5/queued_records");
            then.status(200).body(
                r#"{
                "queueLength": 2264,
                "data": [
                    {
                        "syncOutId": "ID1",
                        "tableName": "test_table_1",
                        "recordId": "ID2",
                        "action": "update",
                        "recordData": {
                            "test_key": "test_value"
                        }
                    },
                    {
                        "syncOutId": "ID3",
                        "tableName": "test_table_2",
                        "recordId": "ID4",
                        "action": "delete"
                    }
                ]
            }"#,
            );
        });

        let result = create_api(&url, "", "").get_queued_records(2).await;

        mock.assert();

        assert!(result.is_ok());

        assert_eq!(
            result.unwrap(),
            RemoteSyncBatchV5 {
                queue_length: 2264,
                data: vec![
                    RemoteSyncRecordV5 {
                        sync_id: "ID1".to_string(),
                        record: CommonSyncRecord {
                            table_name: "test_table_1".to_string(),
                            record_id: "ID2".to_string(),
                            action: SyncAction::Update,
                            record_data: json!({
                                "test_key": "test_value"
                            })
                        }
                    },
                    RemoteSyncRecordV5 {
                        sync_id: "ID3".to_string(),
                        record: CommonSyncRecord {
                            table_name: "test_table_2".to_string(),
                            record_id: "ID4".to_string(),
                            action: SyncAction::Delete,
                            record_data: json!({})
                        }
                    }
                ]
            }
        );
    }
}
