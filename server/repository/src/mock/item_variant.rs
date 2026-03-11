use chrono::NaiveDate;

use crate::{item_variant::item_variant_row::ItemVariantRow, mock::item::*};

pub fn mock_item_a_variant_1() -> ItemVariantRow {
    ItemVariantRow {
        id: "item_a_variant_variant_1".to_string(),
        name: "Item A Variant 1".to_string(),
        item_link_id: mock_item_a().id,
        location_type_id: None,
        deleted_datetime: None,
        vvm_type: None,
        created_datetime: NaiveDate::from_ymd_opt(2024, 2, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        created_by: None,
        manufacturer_id: None,
    }
}

pub fn mock_item_a_variant_2() -> ItemVariantRow {
    ItemVariantRow {
        id: "item_a_variant_variant_1".to_string(),
        name: "Item A Variant 1".to_string(),
        item_link_id: mock_item_a().id,
        location_type_id: None,
        deleted_datetime: None,
        vvm_type: None,
        created_datetime: NaiveDate::from_ymd_opt(2024, 2, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        created_by: None,
        manufacturer_id: None,
    }
}

pub fn mock_item_b_variant_1() -> ItemVariantRow {
    ItemVariantRow {
        id: "item_b_variant_variant_1".to_string(),
        name: "Item B Variant 1".to_string(),
        item_link_id: mock_item_b().id,
        location_type_id: None,
        deleted_datetime: None,
        vvm_type: None,
        created_datetime: NaiveDate::from_ymd_opt(2024, 2, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        created_by: None,
        manufacturer_id: None,
    }
}

pub fn mock_item_b_variant_2() -> ItemVariantRow {
    ItemVariantRow {
        id: "item_b_variant_variant_2".to_string(),
        name: "Item B Variant 2".to_string(),
        item_link_id: mock_item_b().id,
        location_type_id: None,
        deleted_datetime: None,
        vvm_type: None,
        created_datetime: NaiveDate::from_ymd_opt(2024, 2, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        created_by: None,
        manufacturer_id: None,
    }
}

pub fn mock_item_c_variant_1() -> ItemVariantRow {
    ItemVariantRow {
        id: "item_c_variant_variant_1".to_string(),
        name: "Item C Variant 1".to_string(),
        item_link_id: mock_item_c().id,
        location_type_id: None,
        deleted_datetime: None,
        vvm_type: None,
        created_datetime: NaiveDate::from_ymd_opt(2024, 2, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        created_by: None,
        manufacturer_id: None,
    }
}

pub fn mock_vaccine_item_a_variant_1() -> ItemVariantRow {
    ItemVariantRow {
        id: "vaccine_item_a_variant_1".to_string(),
        name: "Vaccine Item A Variant 1".to_string(),
        item_link_id: mock_vaccine_item_a().id,
        location_type_id: None,
        deleted_datetime: None,
        vvm_type: None,
        created_datetime: NaiveDate::from_ymd_opt(2024, 2, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        created_by: None,
        manufacturer_id: None,
    }
}

pub fn mock_item_variants() -> Vec<ItemVariantRow> {
    vec![
        mock_item_a_variant_1(),
        mock_item_a_variant_2(),
        mock_item_b_variant_1(),
        mock_item_b_variant_2(),
        mock_item_c_variant_1(),
        mock_vaccine_item_a_variant_1(),
    ]
}
