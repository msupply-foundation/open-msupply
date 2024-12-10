use repository::item_variant::item_variant_row::ItemVariantRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "item_variant";

const ITEM_VARIANT1: (&str, &str) = (
    "5fb99f9c-03f4-47f2-965b-c9ecd083c675",
    r#"{
        "id": "5fb99f9c-03f4-47f2-965b-c9ecd083c675",
        "name": "Item Variant 1",
        "item_link_id": "8F252B5884B74888AAB73A0D42C09E7A",
        "cold_storage_type_id": null,
        "manufacturer_link_id": null
    }"#,
);

fn item_variant1() -> ItemVariantRow {
    ItemVariantRow {
        id: ITEM_VARIANT1.0.to_string(),
        name: "Item Variant 1".to_string(),
        item_link_id: "8F252B5884B74888AAB73A0D42C09E7A".to_string(), // ITEM_1.0
        cold_storage_type_id: None,
        manufacturer_link_id: None,
        deleted_datetime: None,
    }
}

const ITEM_VARIANT2: (&str, &str) = (
    "a9a986cd-a6dc-4e96-811c-4bc225a4f2d8",
    r#"{
        "id": "a9a986cd-a6dc-4e96-811c-4bc225a4f2d8",
        "name": "Item Variant 2",
        "item_link_id": "8F252B5884B74888AAB73A0D42C09E7A",
        "cold_storage_type_id": null,
        "manufacturer_link_id": "1FB32324AF8049248D929CFB35F255BA"
    }"#,
);

fn item_variant2() -> ItemVariantRow {
    ItemVariantRow {
        id: ITEM_VARIANT2.0.to_string(),
        name: "Item Variant 2".to_string(),
        item_link_id: "8F252B5884B74888AAB73A0D42C09E7A".to_string(), // ITEM_1.0
        cold_storage_type_id: None, //TODO: Add cold storage type when sync is implemented
        manufacturer_link_id: Some("1FB32324AF8049248D929CFB35F255BA".to_string()), // NAME_1.0 (currently marked as manufacturer)
        deleted_datetime: None,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(TABLE_NAME, ITEM_VARIANT1, item_variant1()),
        TestSyncIncomingRecord::new_pull_upsert(TABLE_NAME, ITEM_VARIANT2, item_variant2()),
    ]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        TestSyncOutgoingRecord {
            table_name: TABLE_NAME.to_string(),
            record_id: ITEM_VARIANT1.0.to_string(),
            push_data: json!(item_variant1()),
        },
        TestSyncOutgoingRecord {
            table_name: TABLE_NAME.to_string(),
            record_id: ITEM_VARIANT2.0.to_string(),
            push_data: json!(item_variant2()),
        },
    ]
}
