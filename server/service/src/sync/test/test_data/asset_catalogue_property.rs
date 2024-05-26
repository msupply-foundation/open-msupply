use repository::{
    asset_catalogue_property_row::AssetCataloguePropertyRow, types::PropertyValueType,
};
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "asset_catalogue_property";

const ASSET_CATALOGUE_PROPERTY1: (&str, &str) = (
    "854d8e25-d265-4884-aea3-8f13de3b55fb",
    r#"{
        "id": "854d8e25-d265-4884-aea3-8f13de3b55fb",
        "category_id": "02cbea92-d5bf-4832-863b-c04e093a7760",
        "name": "Energy source",
        "value_type": "STRING",
        "allowed_values": "Electricity,Solar,Passive,Kerosene,Gas"
    }"#,
);

fn asset_catalogue_property1() -> AssetCataloguePropertyRow {
    AssetCataloguePropertyRow {
        id: ASSET_CATALOGUE_PROPERTY1.0.to_string(),
        category_id: "02cbea92-d5bf-4832-863b-c04e093a7760".to_string(),
        name: "Energy source".to_string(),
        value_type: PropertyValueType::String,
        allowed_values: Some("Electricity,Solar,Passive,Kerosene,Gas".to_string()),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        ASSET_CATALOGUE_PROPERTY1,
        asset_catalogue_property1(),
    )]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: ASSET_CATALOGUE_PROPERTY1.0.to_string(),
        push_data: json!(asset_catalogue_property1()),
    }]
}
