use crate::PackVariantRow;

use super::mock_item_a;

pub fn mock_item_a_variant_a() -> PackVariantRow {
    PackVariantRow {
        id: "item_a_unit_a".to_string(),
        item_id: mock_item_a().id,
        short_name: "tab".to_string(),
        long_name: "tablet".to_string(),
        pack_size: 1.0,
        is_active: true,
    }
}

pub fn mock_item_a_variant_b() -> PackVariantRow {
    PackVariantRow {
        id: "item_a_unit_b".to_string(),
        item_id: mock_item_a().id,
        short_name: "blist of 2 tabs".to_string(),
        long_name: "blister of 2 tablets".to_string(),
        pack_size: 2.0,
        is_active: true,
    }
}

pub fn mock_item_a_variant_c() -> PackVariantRow {
    PackVariantRow {
        id: "item_a_unit_c".to_string(),
        item_id: mock_item_a().id,
        short_name: "blist of 3 tabs".to_string(),
        long_name: "blister of 3 tablets".to_string(),
        pack_size: 3.0,
        is_active: true,
    }
}

pub fn mock_item_a_variant_d() -> PackVariantRow {
    PackVariantRow {
        id: "item_a_unit_d".to_string(),
        item_id: mock_item_a().id,
        short_name: "blist of 4 tabs".to_string(),
        long_name: "blister of 4 tablets".to_string(),
        pack_size: 4.0,
        is_active: true,
    }
}

pub fn mock_item_b_variant_a() -> PackVariantRow {
    PackVariantRow {
        id: "item_b_unit_a".to_string(),
        item_id: "item_b".to_string(),
        short_name: "tab".to_string(),
        long_name: "tablet".to_string(),
        pack_size: 1.0,
        is_active: true,
    }
}

pub fn mock_item_b_variant_b() -> PackVariantRow {
    PackVariantRow {
        id: "item_b_unit_b".to_string(),
        item_id: "item_b".to_string(),
        short_name: "blist of 3 tabs".to_string(),
        long_name: "blister of 3 tablets".to_string(),
        pack_size: 3.0,
        is_active: true,
    }
}

pub fn mock_item_b_variant_c() -> PackVariantRow {
    PackVariantRow {
        id: "item_b_unit_c".to_string(),
        item_id: "item_b".to_string(),
        short_name: "blist of 4 tabs".to_string(),
        long_name: "blister of 4 tablets".to_string(),
        pack_size: 4.0,
        is_active: true,
    }
}

pub fn mock_item_b_variant_d() -> PackVariantRow {
    PackVariantRow {
        id: "item_b_unit_d".to_string(),
        item_id: "item_b".to_string(),
        short_name: "blist of 7 tabs".to_string(),
        long_name: "blister of 7 tablets".to_string(),
        pack_size: 7.0,
        is_active: true,
    }
}

pub fn mock_pack_variants() -> Vec<PackVariantRow> {
    vec![
        mock_item_a_variant_a(),
        mock_item_a_variant_b(),
        mock_item_a_variant_c(),
        mock_item_a_variant_d(),
        mock_item_b_variant_a(),
        mock_item_b_variant_b(),
        mock_item_b_variant_c(),
        mock_item_b_variant_d(),
    ]
}
