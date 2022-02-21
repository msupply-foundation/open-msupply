use repository::schema::{NameStoreJoinRow, RemoteSyncBufferAction, RemoteSyncBufferRow};

use crate::sync::translation_remote::{
    test_data::TestSyncRecord, IntegrationRecord, IntegrationUpsertRecord,
};

const NAME_STORE_JOIN_1: (&'static str, &'static str) = (
    "66607B6E7F2A47E782B8AC6743F71A8A",
    r#"{
      "ID": "66607B6E7F2A47E782B8AC6743F71A8A",
      "inactive": false,
      "name_ID": "name_store_a",
      "spare_Category_ID": 0,
      "spare_Category_optional2_id": 0,
      "spare_Category_optional_id": 0,
      "store_ID": "store_a"
  }"#,
);

const NAME_STORE_JOIN_2: (&'static str, &'static str) = (
    "BE65A4A05E4D47E88303D6105A7872CC",
    r#"{
      "ID": "BE65A4A05E4D47E88303D6105A7872CC",
      "inactive": false,
      "name_ID": "name_store_b",
      "spare_Category_ID": 0,
      "spare_Category_optional2_id": 0,
      "spare_Category_optional_id": 0,
      "store_ID": "store_b"
  }"#,
);

#[allow(dead_code)]
const RECORD_TYPE: &'static str = "name_store_join";
#[allow(dead_code)]
pub fn get_test_name_store_join_records() -> Vec<TestSyncRecord> {
    vec![
        TestSyncRecord {
            translated_record: Some(IntegrationRecord::from_upsert(
                IntegrationUpsertRecord::NameStoreJoin(NameStoreJoinRow {
                    id: NAME_STORE_JOIN_1.0.to_string(),
                    store_id: "store_a".to_string(),
                    name_id: "name_store_a".to_string(),
                    name_is_customer: false,
                    name_is_supplier: true,
                }),
            )),
            identifier: "Name store join 1",
            remote_sync_buffer_row: RemoteSyncBufferRow {
                id: "name_store_join_1".to_string(),
                table_name: RECORD_TYPE.to_string(),
                record_id: NAME_STORE_JOIN_1.0.to_string(),
                data: NAME_STORE_JOIN_1.1.to_string(),
                action: RemoteSyncBufferAction::Update,
            },
        },
        TestSyncRecord {
            translated_record: Some(IntegrationRecord::from_upsert(
                IntegrationUpsertRecord::NameStoreJoin(NameStoreJoinRow {
                    id: NAME_STORE_JOIN_2.0.to_string(),
                    store_id: "store_b".to_string(),
                    name_id: "name_store_b".to_string(),
                    name_is_customer: false,
                    name_is_supplier: false,
                }),
            )),
            identifier: "Name store join 2",
            remote_sync_buffer_row: RemoteSyncBufferRow {
                id: "name_store_join_2".to_string(),
                table_name: RECORD_TYPE.to_string(),
                record_id: NAME_STORE_JOIN_2.0.to_string(),
                data: NAME_STORE_JOIN_2.1.to_string(),
                action: RemoteSyncBufferAction::Update,
            },
        },
    ]
}
