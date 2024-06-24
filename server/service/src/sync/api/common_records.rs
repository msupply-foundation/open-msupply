use chrono::Utc;
use repository::{ChangelogTableName, SyncAction as SyncActionRepo, SyncBufferRow};
use serde::{Deserialize, Serialize};
use serde_json::json;
use thiserror::Error;
use util::uuid::uuid;

fn empty_object() -> serde_json::Value {
    json!({})
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CommonSyncRecord {
    pub(crate) table_name: String,
    pub(crate) record_id: String,
    pub(crate) action: SyncAction,
    /// Not set when record is deleted
    #[serde(default = "empty_object")]
    pub(crate) record_data: serde_json::Value,
}

#[derive(Debug, Deserialize, PartialEq, Serialize)]
pub(crate) struct RemoteSyncRecordV5 {
    #[serde(rename = "syncOutId")]
    pub(crate) sync_id: String,
    #[serde(flatten)]
    pub(crate) record: CommonSyncRecord,
}

#[derive(Debug, Deserialize, PartialEq, Serialize)]
pub(crate) struct RemoteSyncBatchV5 {
    #[serde(rename = "queueLength")]
    pub(crate) queue_length: u64,
    #[serde(default)]
    pub(crate) data: Vec<RemoteSyncRecordV5>,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
pub(crate) enum SyncAction {
    #[serde(alias = "insert")]
    Insert,
    #[serde(alias = "update")]
    Update,
    #[serde(alias = "delete")]
    Delete,
    #[serde(alias = "merge")]
    Merge,
}

impl SyncAction {
    fn to_row_action(&self) -> SyncActionRepo {
        match self {
            Self::Insert => SyncActionRepo::Upsert,
            Self::Update => SyncActionRepo::Upsert,
            Self::Delete => SyncActionRepo::Delete,
            Self::Merge => SyncActionRepo::Merge,
        }
    }
}

#[derive(Error, Debug)]
#[error("Failed to parse sync record into sync buffer row, record: '{record:?}'")]
pub(crate) struct ParsingSyncRecordError {
    source: serde_json::Error,
    record: serde_json::Value,
}

impl CommonSyncRecord {
    pub(crate) fn to_buffer_row(
        self,
        source_site_id: Option<i32>,
    ) -> Result<SyncBufferRow, ParsingSyncRecordError> {
        let CommonSyncRecord {
            table_name,
            record_id,
            action,
            record_data: data,
        } = self;

        let record_id = if action == SyncAction::Merge {
            // This is (likely) a temporary fix to avoid merge sync records overriding upserts on target table
            // causing errors as the merge is applied to record that never got upserted first.
            uuid()
        } else if table_name == "name_oms_fields".to_string() {
            format!("{}{:#?}", record_id, ChangelogTableName::NameOmsFields)
        } else {
            record_id
        };

        Ok(SyncBufferRow {
            table_name,
            record_id,
            action: action.to_row_action(),
            data: serde_json::to_string(&data).map_err(|e| ParsingSyncRecordError {
                source: e,
                record: data.clone(),
            })?,
            received_datetime: Utc::now().naive_utc(),
            integration_datetime: None,
            integration_error: None,
            source_site_id,
        })
    }
}

impl RemoteSyncBatchV5 {
    pub(crate) fn extract_sync_ids(&self) -> Vec<String> {
        self.data.iter().map(|r| r.sync_id.clone()).collect()
    }

    pub(crate) fn to_sync_buffer_rows(self) -> Result<Vec<SyncBufferRow>, ParsingSyncRecordError> {
        self.data
            .into_iter()
            .map(|r| r.record.to_buffer_row(None))
            .collect()
    }
}

#[cfg(test)]
impl CommonSyncRecord {
    pub(crate) fn test() -> Self {
        Self {
            table_name: "test".to_string(),
            record_id: "test".to_string(),
            action: SyncAction::Delete,
            record_data: json!({}),
        }
    }
}

// tests
#[cfg(test)]
mod tests {
    use repository::{mock::MockDataInserts, test_db::setup_all, SyncBufferRowRepository};

    use crate::sync::translations::special::item_merge::ItemMergeMessage;

    use super::*;

    #[test]
    fn test_insert_to_upsert_mapping() {
        let record = CommonSyncRecord {
            table_name: "test".to_string(),
            record_id: "test".to_string(),
            action: SyncAction::Insert,
            record_data: json!({}),
        };

        let row = record.to_buffer_row(None).unwrap();
        assert_eq!(row.table_name, "test");
        assert_eq!(row.record_id, "test");
        assert_eq!(row.action, SyncActionRepo::Upsert);
        assert_eq!(row.data, "{}");
    }

    #[actix_rt::test]
    async fn test_remote_sync_batch_v5_to_sync_buffer_rows() {
        let batch = RemoteSyncBatchV5 {
            queue_length: 0,
            data: vec![
                RemoteSyncRecordV5 {
                    sync_id: "test1".to_string(),
                    record: CommonSyncRecord {
                        table_name: "item".to_string(),
                        record_id: "itemA".to_string(),
                        action: SyncAction::Insert,
                        record_data: json!({
                            "ID": "itemA",
                            "item_name": "itemA",
                            "code": "itemA",
                            "unit_ID": "",
                            "type_of": "general",
                            "default_pack_size": 1,
                        }),
                    },
                },
                RemoteSyncRecordV5 {
                    sync_id: "test2".to_string(),
                    record: CommonSyncRecord {
                        table_name: "item".to_string(),
                        record_id: "itemA".to_string(),
                        action: SyncAction::Update,
                        record_data: json!({
                            "ID": "itemA",
                            "item_name": "itemA",
                            "code": "itemA",
                            "unit_ID": "",
                            "type_of": "general",
                            "default_pack_size": 1,
                        }),
                    },
                },
                RemoteSyncRecordV5 {
                    sync_id: "test3".to_string(),
                    record: CommonSyncRecord {
                        table_name: "item".to_string(),
                        record_id: "itemB".to_string(),
                        action: SyncAction::Insert,
                        record_data: json!({
                            "ID": "itemB",
                            "item_name": "itemB",
                            "code": "itemB",
                            "unit_ID": "",
                            "type_of": "general",
                            "default_pack_size": 1,
                        }),
                    },
                },
                RemoteSyncRecordV5 {
                    sync_id: "test4".to_string(),
                    record: CommonSyncRecord {
                        table_name: "item".to_string(),
                        record_id: "itemA".to_string(),
                        action: SyncAction::Merge,
                        record_data: json!({
                            "mergeIdToKeep": "itemA", "mergeIdToDelete": "itemB"
                        }),
                    },
                },
            ],
        }
        .to_sync_buffer_rows()
        .unwrap();

        let (_, connection, _, _) = setup_all(
            "test_sync_buffer_merge_record_does_not_override_upsert",
            MockDataInserts::none(),
        )
        .await;

        let sync_buffer_repository = SyncBufferRowRepository::new(&connection);
        sync_buffer_repository.upsert_many(&batch).unwrap();

        let row = sync_buffer_repository
            .find_one_by_record_id("itemB")
            .unwrap()
            .unwrap();
        assert_eq!(row.action, SyncActionRepo::Upsert);

        // ItemB Upsert + Two Upserts for itemA should should be only be persisted as one + ItemB->ItemA Merge
        let rows = sync_buffer_repository.get_all().unwrap();
        assert_eq!(rows.len(), 3);

        // Just one update for item A
        assert_eq!(
            rows.iter()
                .filter(|r| r.record_id == "itemA" && r.action == SyncActionRepo::Upsert)
                .collect::<Vec<_>>()
                .len(),
            1
        );

        // Merge for itemA
        assert_eq!(
            rows.iter()
                .filter(|r| r.action == SyncActionRepo::Merge
                    && serde_json::from_str::<ItemMergeMessage>(&r.data)
                        .unwrap()
                        .merge_id_to_keep
                        == "itemA")
                .collect::<Vec<_>>()
                .len(),
            1
        );
    }
}
