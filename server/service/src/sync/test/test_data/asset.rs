use crate::sync::translations::asset::LegacyAssetRow;

use super::{TestSyncPullRecord, TestSyncPushRecord};
use repository::asset_row::{AssetRow, AssetRowDelete};
use serde_json::json;

const TABLE_NAME: &'static str = "asset";

const ASSET1: (&'static str, &'static str) = (
    "4c411def-a0b3-46c0-b1a9-24e29504fceb",
    r#"{
        "ID": "4c411def-a0b3-46c0-b1a9-24e29504fceb",
        "Store_ID": "store_a",
        "description": ""
    }"#,
);
fn asset1_pull() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        ASSET1,
        AssetRow {
            id: ASSET1.0.to_string(),
            store_id: "store_a".to_string(),
            property: None,
        },
    )
}
fn asset1_push() -> TestSyncPushRecord {
    TestSyncPushRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: ASSET1.0.to_string(),
        push_data: json!(LegacyAssetRow {
            id: ASSET1.0.to_string(),
            store_id: "store_a".to_string(),
            property: None,
        }),
    }
}
pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![asset1_pull()]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_delete(
        TABLE_NAME,
        ASSET1.0,
        AssetRowDelete(ASSET1.0.to_string()),
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![asset1_push()]
}
