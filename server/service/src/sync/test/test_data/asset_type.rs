use repository::asset_type_row::AssetTypeRow;
use serde_json::json;

use super::{TestSyncPullRecord, TestSyncPushRecord};

const TABLE_NAME: &'static str = "asset_type";

const ASSET_TYPE1: (&'static str, &'static str) = (
    "a6625bba-052b-4cf8-9e0f-b96ebba0a31f",
    r#"{
        "id": "a6625bba-052b-4cf8-9e0f-b96ebba0a31f",
        "name": "Asset Type 1",
        "category_id": "035d2847-1eec-4595-a161-b7cfefc17381"
    }"#,
);

fn asset_type1() -> AssetTypeRow {
    AssetTypeRow {
        id: ASSET_TYPE1.0.to_string(),
        name: "Asset Type 1".to_string(),
        category_id: "035d2847-1eec-4595-a161-b7cfefc17381".to_string(),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        ASSET_TYPE1,
        asset_type1(),
    )]
}

pub(crate) fn test_omsupply_central_push_records() -> Vec<TestSyncPushRecord> {
    vec![TestSyncPushRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: ASSET_TYPE1.0.to_string(),
        push_data: json!(asset_type1()),
    }]
}
