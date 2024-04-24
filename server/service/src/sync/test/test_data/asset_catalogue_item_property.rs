use repository::asset_catalogue_item_property_row::AssetCatalogueItemPropertyRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "asset_catalogue_item_property";

const ASSET_CATALOGUE_ITEM_PROPERTY1: (&str, &str) = (
    "639e728b-f64b-4eef-9fd6-a1874bafb8a4",
    r#"{
        "id": "639e728b-f64b-4eef-9fd6-a1874bafb8a4",
        "catalogue_item_id": "0dda9346-b79f-4f0f-a375-ae778240043a",
        "catalogue_property_id": "854d8e25-d265-4884-aea3-8f13de3b55fb",
        "value_string": "Electricity"
    }"#,
);

fn asset_catalogue_item_property1() -> AssetCatalogueItemPropertyRow {
    AssetCatalogueItemPropertyRow {
        id: ASSET_CATALOGUE_ITEM_PROPERTY1.0.to_string(),
        catalogue_item_id: "0dda9346-b79f-4f0f-a375-ae778240043a".to_string(),
        catalogue_property_id: "854d8e25-d265-4884-aea3-8f13de3b55fb".to_string(),
        value_string: Some("Electricity".to_string()),
        value_int: None,
        value_float: None,
        value_bool: None,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        ASSET_CATALOGUE_ITEM_PROPERTY1,
        asset_catalogue_item_property1(),
    )]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: ASSET_CATALOGUE_ITEM_PROPERTY1.0.to_string(),
        push_data: json!(asset_catalogue_item_property1()),
    }]
}
