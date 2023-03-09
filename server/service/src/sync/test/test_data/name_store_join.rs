use crate::sync::{
    test::TestSyncPullRecord,
    translations::{LegacyTableName, PullUpsertRecord},
};
use repository::NameStoreJoinRow;

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

fn name_store_join_1_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::NAME_STORE_JOIN,
        NAME_STORE_JOIN_1,
        PullUpsertRecord::NameStoreJoin(NameStoreJoinRow {
            id: NAME_STORE_JOIN_1.0.to_string(),
            store_id: "store_a".to_string(),
            name_id: "name_store_c".to_string(),
            name_is_customer: false,
            name_is_supplier: true,
            is_active: true,
        }),
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
const NAME_STORE_JOIN_INACTIVE: (&'static str, &'static str) = (
    "some_inactive",
    r#"{
      "ID": "some_inactive",
      "inactive": true,
      "name_ID": "name_store_a",
      "spare_Category_ID": 0,
      "spare_Category_optional2_id": 0,
      "spare_Category_optional_id": 0,
      "store_ID": "store_b"
  }"#,
);
fn name_store_join_2_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::NAME_STORE_JOIN,
        NAME_STORE_JOIN_2,
        PullUpsertRecord::NameStoreJoin(NameStoreJoinRow {
            id: NAME_STORE_JOIN_2.0.to_string(),
            store_id: "store_b".to_string(),
            name_id: "name_store_a".to_string(),
            name_is_customer: false,
            name_is_supplier: true,
            is_active: true,
        }),
    )
}

fn name_store_inactive_join_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::NAME_STORE_JOIN,
        NAME_STORE_JOIN_INACTIVE,
        PullUpsertRecord::NameStoreJoin(NameStoreJoinRow {
            id: NAME_STORE_JOIN_INACTIVE.0.to_string(),
            store_id: "store_b".to_string(),
            name_id: "name_store_a".to_string(),
            name_is_customer: false,
            name_is_supplier: true,
            is_active: false,
        }),
    )
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
// fn name_store_join_3_pull_record() -> TestSyncPullRecord {
//     TestSyncPullRecord::new_pull_upsert(
//         LegacyTableName::NAME_STORE_JOIN,
//         NAME_STORE_JOIN_3,
//         PullUpsertRecord::NameStoreJoin(NameStoreJoinRow {
//             id: NAME_STORE_JOIN_3.0.to_string(),
//             store_id: "store_b".to_string(),
//             name_id: "name_store_c".to_string(),
//             name_is_customer: true,
//             name_is_supplier: true,
//         }),
//     )
// }

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        name_store_join_1_pull_record(),
        name_store_join_2_pull_record(),
        name_store_inactive_join_pull_record(), // name_store_join_3_pull_record(),
    ]
}
