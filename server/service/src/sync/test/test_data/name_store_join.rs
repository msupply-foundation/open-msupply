use crate::sync::{
    test::{TestFromSyncRecord, TestToSyncRecord},
    translations::name_store_join::LegacyNameStoreJoinRow,
};
use repository::{NameStoreJoinRow, NameStoreJoinRowDelete};
use serde_json::json;

const TABLE_NAME: &'static str = "name_store_join";

const NAME_STORE_JOIN_1: (&'static str, &'static str) = (
    "66607B6E7F2A47E782B8AC6743F71A8A",
    r#"{
      "ID": "66607B6E7F2A47E782B8AC6743F71A8A",
      "inactive": false,
      "name_ID": "name_store_c",
      "spare_Category_ID": 0,
      "spare_Category_optional2_id": 0,
      "spare_Category_optional_id": 0,
      "store_ID": "store_a"
  }"#,
);

fn name_store_join_1_pull_record() -> TestFromSyncRecord {
    TestFromSyncRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_STORE_JOIN_1,
        NameStoreJoinRow {
            id: NAME_STORE_JOIN_1.0.to_string(),
            store_id: "store_a".to_string(),
            name_link_id: "name_store_c".to_string(),
            name_is_customer: false,
            name_is_supplier: true,
        },
    )
}

const NAME_STORE_JOIN_2: (&'static str, &'static str) = (
    "BE65A4A05E4D47E88303D6105A7872CC",
    r#"{
      "ID": "BE65A4A05E4D47E88303D6105A7872CC",
      "inactive": false,
      "name_ID": "name_store_a",
      "spare_Category_ID": 0,
      "spare_Category_optional2_id": 0,
      "spare_Category_optional_id": 0,
      "store_ID": "store_b"
  }"#,
);
const NAME_STORE_JOIN_INACTIVE_2: (&'static str, &'static str) = (
    "BE65A4A05E4D47E88303D6105A7872CC",
    r#"{
      "ID": "BE65A4A05E4D47E88303D6105A7872CC",
      "inactive": true,
      "name_ID": "name_store_a",
      "spare_Category_ID": 0,
      "spare_Category_optional2_id": 0,
      "spare_Category_optional_id": 0,
      "store_ID": "store_b"
  }"#,
);
fn name_store_join_2_pull_record() -> TestFromSyncRecord {
    TestFromSyncRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_STORE_JOIN_2,
        NameStoreJoinRow {
            id: NAME_STORE_JOIN_2.0.to_string(),
            store_id: "store_b".to_string(),
            name_link_id: "name_store_a".to_string(),
            name_is_customer: false,
            name_is_supplier: true,
        },
    )
}
fn name_store_join_2_delete_record() -> TestFromSyncRecord {
    TestFromSyncRecord::new_pull_delete(
        TABLE_NAME,
        NAME_STORE_JOIN_2.0,
        NameStoreJoinRowDelete(NAME_STORE_JOIN_2.0.to_string()),
    )
}

fn name_store_join_2_inactive_pull_record() -> TestFromSyncRecord {
    let mut record = name_store_join_2_delete_record();
    record.sync_buffer_row.data = NAME_STORE_JOIN_INACTIVE_2.1.to_string();
    record
}

// same as NAME_STORE_JOIN_2 but with new om fields
// See TODO in name_store_join translator
// const NAME_STORE_JOIN_3: (&'static str, &'static str) = (
//     "BE65A4A05E4D47E88303D6105A7872C2",
//     r#"{
//       "ID": "BE65A4A05E4D47E88303D6105A7872C2",
//       "inactive": false,
//       "name_ID": "name_store_c",
//       "spare_Category_ID": 0,
//       "spare_Category_optional2_id": 0,
//       "spare_Category_optional_id": 0,
//       "store_ID": "store_b",
//       "om_name_is_customer": true,
//       "om_name_is_supplier": true
//   }"#,
// );
// fn name_store_join_3_pull_record() -> TestFromSyncRecord {
//     TestFromSyncRecord::new_pull_upsert(
//         TABLE_NAME,
//         NAME_STORE_JOIN_3,
//         NameStoreJoinRow {
//             id: NAME_STORE_JOIN_3.0.to_string(),
//             store_id: "store_b".to_string(),
//             name_id: "name_store_c".to_string(),
//             name_is_customer: true,
//             name_is_supplier: true,
//         }
//     )
// }

pub(crate) fn test_pull_upsert_records() -> Vec<TestFromSyncRecord> {
    vec![
        name_store_join_1_pull_record(),
        name_store_join_2_pull_record(),
        // name_store_join_3_pull_record(),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestFromSyncRecord> {
    vec![name_store_join_2_delete_record()]
}

pub(crate) fn test_pull_upsert_inactive_records() -> Vec<TestFromSyncRecord> {
    vec![name_store_join_2_inactive_pull_record()]
}

pub(crate) fn test_push_upsert() -> Vec<TestToSyncRecord> {
    vec![
        TestToSyncRecord {
            record_id: NAME_STORE_JOIN_1.0.to_string(),
            table_name: TABLE_NAME.to_string(),
            push_data: json!(LegacyNameStoreJoinRow {
                id: NAME_STORE_JOIN_1.0.to_string(),
                store_id: "store_a".to_string(),
                name_id: "name_store_c".to_string(),
                inactive: Some(false),
                name_is_customer: Some(false),
                name_is_supplier: Some(true),
            }),
        },
        TestToSyncRecord {
            record_id: NAME_STORE_JOIN_2.0.to_string(),
            table_name: TABLE_NAME.to_string(),
            push_data: json!(LegacyNameStoreJoinRow {
                id: NAME_STORE_JOIN_2.0.to_string(),
                store_id: "store_b".to_string(),
                name_id: "name_store_a".to_string(),
                inactive: Some(false),
                name_is_customer: Some(false),
                name_is_supplier: Some(true),
            }),
        },
    ]
}
