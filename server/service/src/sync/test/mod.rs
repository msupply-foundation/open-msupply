#[cfg(feature = "integration_test")]
mod integration;
pub(crate) mod merge_helpers;
mod pull_and_push;
pub(crate) mod test_data;

use super::translations::{IntegrationOperation, PullTranslateResult};
use repository::{mock::MockData, sync_buffer::SyncRecordData, *};

#[derive(Debug)]
pub(crate) struct TestSyncIncomingRecord {
    /// Expected result for the imported data
    pub(crate) translated_record: PullTranslateResult,
    /// Row as stored in the remote sync buffer
    pub(crate) sync_buffer_row: SyncBufferRow,
    // Extra data that translation test relies on
    pub(crate) extra_data: Option<MockData>,
}

impl TestSyncIncomingRecord {
    fn new_pull_upsert(
        table_name: &str,
        // .0 = id .1 = data
        id_and_data: (&str, &str),
        upsert: Row,
    ) -> TestSyncIncomingRecord {
        TestSyncIncomingRecord {
            translated_record: PullTranslateResult::upsert(upsert),
            sync_buffer_row: SyncBufferRow {
                table_name: table_name.to_string(),
                record_id: id_and_data.0.to_string(),
                data: SyncRecordData(serde_json::from_str(id_and_data.1).unwrap()),
                action: SyncAction::Upsert,
                ..Default::default()
            },
            extra_data: None,
        }
    }

    fn new_pull_upsert_non_sync(
        table_name: &str,
        id_and_data: (&str, &str),
        upsert: NonSyncRow,
    ) -> TestSyncIncomingRecord {
        TestSyncIncomingRecord {
            translated_record: PullTranslateResult::upsert_non_sync(upsert),
            sync_buffer_row: SyncBufferRow {
                table_name: table_name.to_string(),
                record_id: id_and_data.0.to_string(),
                data: SyncRecordData(serde_json::from_str(id_and_data.1).unwrap()),
                action: SyncAction::Upsert,
                ..Default::default()
            },
            extra_data: None,
        }
    }

    fn new_pull_delete(
        table_name: &str,
        id: &str,
        delete_table: ChangelogTableName,
    ) -> TestSyncIncomingRecord {
        Self::new_pull_deletes(table_name, id, vec![(delete_table, id.to_string())])
    }
    fn new_pull_deletes(
        table_name: &str,
        id: &str,
        deletes: Vec<(ChangelogTableName, String)>,
    ) -> TestSyncIncomingRecord {
        TestSyncIncomingRecord {
            translated_record: PullTranslateResult::deletes(deletes),
            sync_buffer_row: SyncBufferRow {
                table_name: table_name.to_string(),
                record_id: id.to_string(),
                data: SyncRecordData(serde_json::json!({})),
                action: SyncAction::Delete,
                ..Default::default()
            },
            extra_data: None,
        }
    }

    pub(crate) async fn insert_extra_data(&self, connection: &StorageConnection) {
        if let Some(data) = &self.extra_data {
            data.insert(connection);
        }
    }
}

/// To be used in combination with TestSyncIncomingRecord.
/// I.e. first run and integrate a row from TestSyncIncomingRecord and then try to push this record out
#[derive(Debug)]
pub struct TestSyncOutgoingRecord {
    /// Record id for the row to be pushed.
    /// Its assumed the row exists, e.g. because it has been integrated before through a
    /// TestSyncIncomingRecord
    pub record_id: String,
    pub table_name: String,
    /// Expected record as pushed out to the server
    pub push_data: serde_json::Value,
}

pub(crate) fn extract_sync_buffer_rows(
    records: &Vec<TestSyncIncomingRecord>,
) -> Vec<SyncBufferRow> {
    records
        .iter()
        .map(|test_record| test_record.sync_buffer_row.clone())
        .collect()
}

pub(crate) async fn insert_all_extra_data(
    records: &Vec<TestSyncIncomingRecord>,
    connection: &StorageConnection,
) {
    for record in records {
        record.insert_extra_data(connection).await
    }
}

pub(crate) async fn check_test_records_against_database(
    con: &StorageConnection,
    test_records: Vec<TestSyncIncomingRecord>,
) {
    for test_record in test_records {
        let translated_records = match test_record.translated_record {
            PullTranslateResult::IntegrationOperations(translated_record) => translated_record,
            // Should this throw an assertion ?
            _ => continue,
        };
        check_integrated(con, &translated_records)
    }
}

pub(crate) fn check_integrated(
    con: &StorageConnection,
    integration_records: &Vec<IntegrationOperation>,
) {
    for record in integration_records {
        match record {
            IntegrationOperation::Upsert(row) => row.assert_upserted(con),
            // Non-changelog rows (link tables / sync_request): no dedicated assert.
            IntegrationOperation::UpsertNonSync(_) => {}
            IntegrationOperation::UpsertDocument(document) => {
                assert_eq!(
                    repository::DocumentRepository::new(con).find_one_by_id(&document.id),
                    Ok(Some((**document).clone()))
                );
            }
            IntegrationOperation::Delete {
                table_name,
                record_id,
            } => assert_row_deleted(con, table_name.clone(), record_id),
        }
    }
}
