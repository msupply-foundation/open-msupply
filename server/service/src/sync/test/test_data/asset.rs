use repository::asset_row::AssetRow;
use serde_json::json;
use util::Defaults;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &'static str = "asset";

const ASSET1: (&'static str, &'static str) = (
    "3de161ed-93ef-4210-aa31-3ae9e53748e8",
    r#"{
        "id":  "3de161ed-93ef-4210-aa31-3ae9e53748e8",
        "notes": "Asset 1",
        "asset_number": "AT1",
        "store_id": "store_a",
        "created_datetime": "2020-01-22T15:16:00",
        "modified_datetime": "2020-01-22T15:16:00"   
    }"#,
);

fn asset1() -> AssetRow {
    AssetRow {
        id: ASSET1.0.to_string(),
        asset_number: Some("AT1".to_string()),
        store_id: Some("store_a".to_string()),
        notes: Some("Asset 1".to_string()),
        serial_number: None,
        catalogue_item_id: None,
        asset_category_id: None,
        asset_class_id: None,
        asset_type_id: None,
        installation_date: None,
        replacement_date: None,
        created_datetime: Defaults::naive_date_time(),
        modified_datetime: Defaults::naive_date_time(),
        deleted_datetime: None,
        ..Default::default()
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        ASSET1,
        asset1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    // New type for TestSyncToSyncRecord
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: ASSET1.0.to_string(),
        push_data: json!(asset1()),
    }]
}
