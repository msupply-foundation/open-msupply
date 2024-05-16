use repository::{asset_property_row::AssetPropertyRow, types::PropertyValueType};
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "asset_property";

const ASSET_PROPERTY1: (&str, &str) = (
    "59d20a10-0555-4e65-9c36-2c86e50e5abc",
    r#"{
        "id": "59d20a10-0555-4e65-9c36-2c86e50e5abc",
        "asset_category_id": "02cbea92-d5bf-4832-863b-c04e093a7760", 
        "name": "favourite_colour",
        "description": "Your favourite colour",
        "value_type": "STRING",
        "allowed_values": "Blue,Yellow"
    }"#,
);

fn asset_property1() -> AssetPropertyRow {
    AssetPropertyRow {
        id: ASSET_PROPERTY1.0.to_string(),
        asset_class_id: None,
        asset_category_id: Some("02cbea92-d5bf-4832-863b-c04e093a7760".to_string()), // Refrigerators and freezers
        asset_type_id: None,
        name: "favourite_colour".to_string(),
        description: "Your favourite colour".to_string(),
        value_type: PropertyValueType::String,
        allowed_values: Some("Blue,Yellow".to_string()),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        ASSET_PROPERTY1,
        asset_property1(),
    )]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: ASSET_PROPERTY1.0.to_string(),
        push_data: json!(asset_property1()),
    }]
}
