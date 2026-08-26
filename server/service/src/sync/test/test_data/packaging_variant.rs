use repository::item_variant::packaging_variant_row::PackagingVariantRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "packaging_variant";

const PACKAGING_VARIANT_1: (&str, &str) = (
    "de8fa974-7762-454b-a58d-c2eb67527b50",
    r#"{
        "id":"de8fa974-7762-454b-a58d-c2eb67527b50",
        "item_variant_id": "5fb99f9c-03f4-47f2-965b-c9ecd083c675",
        "name": "Item Variant 1 - Packaging Variant 1",
        "item_link_id": "8F252B5884B74888AAB73A0D42C09E7A",
        "packaging_level": 1,
        "pack_size": null,
        "volume_per_unit": null,
        "deleted_datetime": null
    }"#,
);

fn packaging_variant1() -> PackagingVariantRow {
    PackagingVariantRow {
        id: PACKAGING_VARIANT_1.0.to_string(),
        name: "Item Variant 1 - Packaging Variant 1".to_string(),
        item_variant_id: "5fb99f9c-03f4-47f2-965b-c9ecd083c675".to_string(), // ITEM_VARIANT_1.0
        packaging_level: 1,
        pack_size: None,
        volume_per_unit: None,
        deleted_datetime: None,
    }
}

const PACKAGING_VARIANT_2: (&str, &str) = (
    "e02f540d-19bf-44c9-ab46-f5e8069f32db",
    r#"{
        "id":"e02f540d-19bf-44c9-ab46-f5e8069f32db",
        "item_variant_id": "5fb99f9c-03f4-47f2-965b-c9ecd083c675",
        "name": "Item Variant 1 - Packaging Variant 2",
        "item_link_id": "8F252B5884B74888AAB73A0D42C09E7A",
        "packaging_level": 2,
        "pack_size": 10,
        "volume_per_unit": 0.001,
        "deleted_datetime": null
    }"#,
);

fn packaging_variant2() -> PackagingVariantRow {
    PackagingVariantRow {
        id: PACKAGING_VARIANT_2.0.to_string(),
        name: "Item Variant 1 - Packaging Variant 2".to_string(),
        item_variant_id: "5fb99f9c-03f4-47f2-965b-c9ecd083c675".to_string(), // ITEM_VARIANT_1.0
        packaging_level: 2,
        pack_size: Some(10.0),
        volume_per_unit: Some(0.001),
        deleted_datetime: None,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            PACKAGING_VARIANT_1,
            packaging_variant1(),
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            PACKAGING_VARIANT_2,
            packaging_variant2(),
        ),
    ]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        TestSyncOutgoingRecord {
            table_name: TABLE_NAME.to_string(),
            record_id: PACKAGING_VARIANT_1.0.to_string(),
            push_data: json!(packaging_variant1()),
        },
        TestSyncOutgoingRecord {
            table_name: TABLE_NAME.to_string(),
            record_id: PACKAGING_VARIANT_2.0.to_string(),
            push_data: json!(packaging_variant2()),
        },
    ]
}
