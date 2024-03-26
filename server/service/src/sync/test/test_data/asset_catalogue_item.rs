use repository::asset_catalogue_item_row::AssetCatalogueItemRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "asset_catalogue_item";

const ASSET_CATALOGUE_ITEM1: (&str, &str) = (
    "0dda9346-b79f-4f0f-a375-ae778240043a",
    r#"{
        "id": "0dda9346-b79f-4f0f-a375-ae778240043a",
        "name": "Asset Catalogue Item 1",
        "class_id": "32608ef9-dce5-41a7-b3e9-92b0fe086c7e",
        "category_id": "035d2847-1eec-4595-a161-b7cfefc17381",
        "code": "A1",
        "manufacturer": "Manufacturer 1",
        "model": "Model 1",
        "type_id": "a6625bba-052b-4cf8-9e0f-b96ebba0a31f"       
    }"#,
);

fn asset_catalogue_item1() -> AssetCatalogueItemRow {
    AssetCatalogueItemRow {
        id: ASSET_CATALOGUE_ITEM1.0.to_string(),
        class_id: "32608ef9-dce5-41a7-b3e9-92b0fe086c7e".to_string(),
        category_id: "035d2847-1eec-4595-a161-b7cfefc17381".to_string(),
        code: "A1".to_string(),
        manufacturer: Some("Manufacturer 1".to_string()),
        model: "Model 1".to_string(),
        type_id: "a6625bba-052b-4cf8-9e0f-b96ebba0a31f".to_string(),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        ASSET_CATALOGUE_ITEM1,
        asset_catalogue_item1(),
    )]
}

pub(crate) fn test_omsupply_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: ASSET_CATALOGUE_ITEM1.0.to_string(),
        push_data: json!(asset_catalogue_item1()),
    }]
}
