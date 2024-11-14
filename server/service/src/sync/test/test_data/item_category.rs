use crate::sync::test::TestSyncIncomingRecord;
use repository::category_row::{CategoryRow, CategoryRowDelete};

const TABLE_NAME: &str = "item_category";

const ITEM_CATEGORY_1: (&str, &str) = (
    "B4A0CB55544B4473B257CC8A8A433CD8",
    r#"{
      "Description": "MEDICINES USED IN DIARRHOEA",
      "ID": "B4A0CB55544B4473B257CC8A8A433CD8",
      "custom_data": null,
      "parent_ID": "7A41484C293D435AAA7F78AB1DE25460",
      "sort_order": 10,
      "summary_only": false
}"#,
);
const ITEM_CATEGORY_LEVEL_2_1: (&str, &str) = (
    "7A41484C293D435AAA7F78AB1DE25460",
    r#"{
      "Description": "General",
      "ID": "7A41484C293D435AAA7F78AB1DE25460",
      "parent_ID": "DF4DF32BDA214CE7ACDC22017380EDCB",
      "sort_order": 2,
      "summary_only": false
}"#,
);
const ITEM_CATEGORY_LEVEL_1_1: (&str, &str) = (
    "DF4DF32BDA214CE7ACDC22017380EDCB",
    r#"{
      "Description": "Medicines",
      "ID": "DF4DF32BDA214CE7ACDC22017380EDCB",
      "custom_data": null,
      "sort_order": 4,
      "summary_only": false
}"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ITEM_CATEGORY_1,
            CategoryRow {
                id: ITEM_CATEGORY_1.0.to_owned(),
                name: "MEDICINES USED IN DIARRHOEA".to_owned(),
                description: Some("MEDICINES USED IN DIARRHOEA".to_owned()),
                parent_id: Some("7A41484C293D435AAA7F78AB1DE25460".to_owned()),
                deleted_datetime: None,
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ITEM_CATEGORY_LEVEL_2_1,
            CategoryRow {
                id: ITEM_CATEGORY_LEVEL_2_1.0.to_owned(),
                name: "General".to_owned(),
                description: Some("General".to_owned()),
                parent_id: Some("DF4DF32BDA214CE7ACDC22017380EDCB".to_owned()),
                deleted_datetime: None,
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ITEM_CATEGORY_LEVEL_1_1,
            CategoryRow {
                id: ITEM_CATEGORY_LEVEL_1_1.0.to_owned(),
                name: "Medicines".to_owned(),
                description: Some("Medicines".to_owned()),
                parent_id: None,
                deleted_datetime: None,
            },
        ),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        ITEM_CATEGORY_1.0,
        CategoryRowDelete(ITEM_CATEGORY_1.0.to_string()),
    )]
}
