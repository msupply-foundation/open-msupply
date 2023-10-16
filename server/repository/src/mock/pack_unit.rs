use crate::PackUnitRow;

use super::mock_item_a;

pub fn mock_item_a_unit_a() -> PackUnitRow {
    PackUnitRow {
        id: "item_a_unit_a".to_string(),
        item_id: mock_item_a().id,
        short_name: "tab".to_string(),
        long_name: "tablet".to_string(),
        pack_size: 1,
    }
}

pub fn mock_item_a_unit_b() -> PackUnitRow {
    PackUnitRow {
        id: "item_a_unit_b".to_string(),
        item_id: mock_item_a().id,
        short_name: "blist of 2 tabs".to_string(),
        long_name: "blister of 2 tablets".to_string(),
        pack_size: 2,
    }
}

pub fn mock_item_a_unit_c() -> PackUnitRow {
    PackUnitRow {
        id: "item_a_unit_c".to_string(),
        item_id: mock_item_a().id,
        short_name: "blist of 3 tabs".to_string(),
        long_name: "blister of 3 tablets".to_string(),
        pack_size: 3,
    }
}

pub fn mock_item_a_unit_d() -> PackUnitRow {
    PackUnitRow {
        id: "item_a_unit_d".to_string(),
        item_id: mock_item_a().id,
        short_name: "blist of 4 tabs".to_string(),
        long_name: "blister of 4 tablets".to_string(),
        pack_size: 4,
    }
}

pub fn mock_item_b_unit_a() -> PackUnitRow {
    PackUnitRow {
        id: "item_b_unit_a".to_string(),
        item_id: "item_b".to_string(),
        short_name: "tab".to_string(),
        long_name: "tablet".to_string(),
        pack_size: 1,
    }
}

pub fn mock_item_b_unit_b() -> PackUnitRow {
    PackUnitRow {
        id: "item_b_unit_b".to_string(),
        item_id: "item_b".to_string(),
        short_name: "blist of 3 tabs".to_string(),
        long_name: "blister of 3 tablets".to_string(),
        pack_size: 3,
    }
}

pub fn mock_item_b_unit_c() -> PackUnitRow {
    PackUnitRow {
        id: "item_b_unit_c".to_string(),
        item_id: "item_b".to_string(),
        short_name: "blist of 4 tabs".to_string(),
        long_name: "blister of 4 tablets".to_string(),
        pack_size: 4,
    }
}

pub fn mock_item_b_unit_d() -> PackUnitRow {
    PackUnitRow {
        id: "item_b_unit_d".to_string(),
        item_id: "item_b".to_string(),
        short_name: "blist of 7 tabs".to_string(),
        long_name: "blister of 7 tablets".to_string(),
        pack_size: 7,
    }
}

pub fn mock_pack_units() -> Vec<PackUnitRow> {
    vec![
        mock_item_a_unit_a(),
        mock_item_a_unit_b(),
        mock_item_a_unit_c(),
        mock_item_a_unit_d(),
        mock_item_b_unit_a(),
        mock_item_b_unit_b(),
        mock_item_b_unit_c(),
        mock_item_b_unit_d(),
    ]
}
