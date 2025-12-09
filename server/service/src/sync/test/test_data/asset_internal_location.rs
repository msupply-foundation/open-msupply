use repository::assets::asset_internal_location_row::AssetInternalLocationRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "asset_internal_location";

const ASSET_INTERNAL_LOCATION1: (&str, &str) = (
    "892a4827-d6d7-4183-a6bd-be9df27719be",
    r#"{
        "id":  "892a4827-d6d7-4183-a6bd-be9df27719be",
        "asset_id": "3de161ed-93ef-4210-aa31-3ae9e53748e8",
        "location_id": "cf5812e0c33911eb9757779d39ae2bdb"
    }"#,
);

fn asset_internal_location1() -> AssetInternalLocationRow {
    AssetInternalLocationRow {
        id: ASSET_INTERNAL_LOCATION1.0.to_string(),
        asset_id: "3de161ed-93ef-4210-aa31-3ae9e53748e8".to_string(),
        location_id: "cf5812e0c33911eb9757779d39ae2bdb".to_string(),
        store_id: None,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        ASSET_INTERNAL_LOCATION1,
        asset_internal_location1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    // New type for TestSyncToSyncRecord
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: ASSET_INTERNAL_LOCATION1.0.to_string(),
        push_data: json!(asset_internal_location1()),
    }]
}
