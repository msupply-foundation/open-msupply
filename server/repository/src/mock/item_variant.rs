use crate::{item_variant::item_variant_row::ItemVariantRow, mock::item::*};

pub fn mock_item_a_variant_1() -> ItemVariantRow {
    ItemVariantRow {
        id: "item_a_variant_variant_1".to_string(),
        name: "Item A Variant 1".to_string(),
        item_link_id: mock_item_a().id,
        cold_storage_type_id: None,
        doses_per_unit: None,
        manufacturer_link_id: None,
        deleted_datetime: None,
    }
}

pub fn mock_item_a_variant_2() -> ItemVariantRow {
    ItemVariantRow {
        id: "item_a_variant_variant_1".to_string(),
        name: "Item A Variant 1".to_string(),
        item_link_id: mock_item_a().id,
        cold_storage_type_id: None,
        doses_per_unit: Some(10),
        manufacturer_link_id: None,
        deleted_datetime: None,
    }
}

pub fn mock_item_b_variant_1() -> ItemVariantRow {
    ItemVariantRow {
        id: "item_b_variant_variant_1".to_string(),
        name: "Item B Variant 1".to_string(),
        item_link_id: mock_item_b().id,
        cold_storage_type_id: None,
        doses_per_unit: None,
        manufacturer_link_id: None,
        deleted_datetime: None,
    }
}

pub fn mock_item_b_variant_2() -> ItemVariantRow {
    ItemVariantRow {
        id: "item_b_variant_variant_2".to_string(),
        name: "Item B Variant 2".to_string(),
        item_link_id: mock_item_b().id,
        cold_storage_type_id: None,
        doses_per_unit: Some(10),
        manufacturer_link_id: None,
        deleted_datetime: None,
    }
}

pub fn mock_item_c_variant_1() -> ItemVariantRow {
    ItemVariantRow {
        id: "item_c_variant_variant_1".to_string(),
        name: "Item C Variant 1".to_string(),
        item_link_id: mock_item_c().id,
        cold_storage_type_id: None,
        doses_per_unit: None,
        manufacturer_link_id: None,
        deleted_datetime: None,
    }
}

pub fn mock_item_variants() -> Vec<ItemVariantRow> {
    vec![
        mock_item_a_variant_1(),
        mock_item_a_variant_2(),
        mock_item_b_variant_1(),
        mock_item_b_variant_2(),
        mock_item_c_variant_1(),
    ]
}
