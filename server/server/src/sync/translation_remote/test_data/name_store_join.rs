use repository::{
    schema::{RemoteSyncBufferAction, RemoteSyncBufferRow},
    ChangelogAction, ChangelogRow, ChangelogTableName, NameStoreJoinRow,
};
use serde_json::json;

use crate::sync::translation_remote::{
    name_store_join::LegacyNameStoreJoinRow,
    pull::{IntegrationRecord, IntegrationUpsertRecord},
    test_data::TestSyncRecord,
    TRANSLATION_RECORD_NAME_STORE_JOIN,
};

use super::TestSyncPushRecord;

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
fn name_store_join_1_pull_record() -> TestSyncRecord {
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
            table_name: TRANSLATION_RECORD_NAME_STORE_JOIN.to_string(),
            record_id: NAME_STORE_JOIN_1.0.to_string(),
            data: NAME_STORE_JOIN_1.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn name_store_join_1_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::NameStoreJoin,
            row_id: NAME_STORE_JOIN_1.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyNameStoreJoinRow {
            ID: NAME_STORE_JOIN_1.0.to_string(),
            store_ID: "store_a".to_string(),
            name_ID: "name_store_a".to_string(),
            name_is_customer: None,
            name_is_supplier: None,
        }),
    }
}

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
fn name_store_join_2_pull_record() -> TestSyncRecord {
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
            table_name: TRANSLATION_RECORD_NAME_STORE_JOIN.to_string(),
            record_id: NAME_STORE_JOIN_2.0.to_string(),
            data: NAME_STORE_JOIN_2.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn name_store_join_2_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::NameStoreJoin,
            row_id: NAME_STORE_JOIN_2.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyNameStoreJoinRow {
            ID: NAME_STORE_JOIN_2.0.to_string(),
            store_ID: "store_b".to_string(),
            name_ID: "name_store_b".to_string(),
            name_is_customer: None,
            name_is_supplier: None,
        }),
    }
}

// same as NAME_STORE_JOIN_2 but with new om fields
const NAME_STORE_JOIN_3: (&'static str, &'static str) = (
    "BE65A4A05E4D47E88303D6105A7872C2",
    r#"{
      "ID": "BE65A4A05E4D47E88303D6105A7872C2",
      "inactive": false,
      "name_ID": "name_store_b",
      "spare_Category_ID": 0,
      "spare_Category_optional2_id": 0,
      "spare_Category_optional_id": 0,
      "store_ID": "store_b",
      "name_is_customer": true,
      "name_is_supplier": true
  }"#,
);
fn name_store_join_3_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::NameStoreJoin(NameStoreJoinRow {
                id: NAME_STORE_JOIN_3.0.to_string(),
                store_id: "store_b".to_string(),
                name_id: "name_store_b".to_string(),
                name_is_customer: true,
                name_is_supplier: true,
            }),
        )),
        identifier: "Name store join 3",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "name_store_join_3".to_string(),
            table_name: TRANSLATION_RECORD_NAME_STORE_JOIN.to_string(),
            record_id: NAME_STORE_JOIN_3.0.to_string(),
            data: NAME_STORE_JOIN_3.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn name_store_join_3_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::NameStoreJoin,
            row_id: NAME_STORE_JOIN_3.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyNameStoreJoinRow {
            ID: NAME_STORE_JOIN_3.0.to_string(),
            store_ID: "store_b".to_string(),
            name_ID: "name_store_b".to_string(),
            name_is_customer: Some(true),
            name_is_supplier: Some(true),
        }),
    }
}

#[allow(dead_code)]
pub fn get_test_name_store_join_records() -> Vec<TestSyncRecord> {
    vec![
        name_store_join_1_pull_record(),
        name_store_join_2_pull_record(),
        name_store_join_3_pull_record(),
    ]
}

#[allow(dead_code)]
pub fn get_test_push_name_store_join_records() -> Vec<TestSyncPushRecord> {
    vec![
        name_store_join_1_push_record(),
        name_store_join_2_push_record(),
        name_store_join_3_push_record(),
    ]
}
