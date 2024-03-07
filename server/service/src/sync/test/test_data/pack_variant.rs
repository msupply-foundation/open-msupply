use repository::PackVariantRow;
use serde_json::json;

use super::{TestFromSyncRecord, TestToSyncRecord};

const TABLE_NAME: &'static str = "pack_variant";

const PACK_VARIANT1: (&'static str, &'static str) = (
    "6f075ab5-4aa0-46b9-9184-159d62126f86",
    r#"{
        "id": "6f075ab5-4aa0-46b9-9184-159d62126f86",
        "isActive": true,
        "itemId": "item_a",
        "longName": "Some long name",
        "packSize": 100,
        "shortName": "Some short name"
    }"#,
);

fn pack_variant1() -> PackVariantRow {
    PackVariantRow {
        id: PACK_VARIANT1.0.to_string(),
        item_id: "item_a".to_string(),
        short_name: "Some short name".to_string(),
        long_name: "Some long name".to_string(),
        pack_size: 100,
        is_active: true,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestFromSyncRecord> {
    vec![TestFromSyncRecord::new_pull_upsert(
        TABLE_NAME,
        PACK_VARIANT1,
        pack_variant1(),
    )]
}

pub(crate) fn test_omsupply_central_push_records() -> Vec<TestToSyncRecord> {
    vec![TestToSyncRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PACK_VARIANT1.0.to_string(),
        push_data: json!(pack_variant1()),
    }]
}
