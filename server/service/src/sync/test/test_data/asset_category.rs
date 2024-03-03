use repository::asset_category_row::AssetCategoryRow;
use serde_json::json;

use super::{TestSyncPullRecord, TestSyncPushRecord};

const TABLE_NAME: &'static str = "asset_category";

const ASSET_CATEGORY1: (&'static str, &'static str) = (
    "035d2847-1eec-4595-a161-b7cfefc17381",
    r#"{
        "id": "035d2847-1eec-4595-a161-b7cfefc17381",
        "name": "Asset Category 1",
        "class_id": "6f075ab5-4aa0-46b9-9184-159d62126f86"
    }"#,
);

fn asset_category1() -> AssetCategoryRow {
    AssetCategoryRow {
        id: ASSET_CATEGORY1.0.to_string(),
        name: "Asset Category 1".to_string(),
        class_id: "6f075ab5-4aa0-46b9-9184-159d62126f86".to_string(),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        ASSET_CATEGORY1,
        asset_category1(),
    )]
}

pub(crate) fn test_omsupply_central_push_records() -> Vec<TestSyncPushRecord> {
    vec![TestSyncPushRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: ASSET_CATEGORY1.0.to_string(),
        push_data: json!(asset_category1()),
    }]
}
