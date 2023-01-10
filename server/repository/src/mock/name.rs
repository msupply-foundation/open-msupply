use util::{constants::INVENTORY_ADJUSTMENT_NAME_CODE, inline_init};

use crate::NameRow;

pub fn mock_name_store_a() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_store_a");
        r.name = String::from("Store A");
        r.code = String::from("code");
        r.is_supplier = true;
    })
}

pub fn mock_name_store_b() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_store_b");
        r.name = String::from("Store B");
        r.code = String::from("code");
    })
}

pub fn mock_name_store_c() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_store_c");
        r.name = String::from("Store C");
        r.code = String::from("code");
        r.is_supplier = true;
    })
}

pub fn mock_name_store_e() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_store_e");
        r.name = String::from("Store E");
        r.code = String::from("code");
        r.is_supplier = true;
    })
}

pub fn mock_name_a() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_a");
        r.name = String::from("name_a");
        r.code = String::from("name_a");
        r.is_supplier = true;
    })
}

// Not visible in store_a
pub fn mock_name_b() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_b");
        r.name = String::from("name_b");
        r.code = String::from("name_b");
        r.is_supplier = true;
    })
}

pub fn mock_name_c() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_c");
        r.name = String::from("name_c");
        r.code = String::from("name_c");
        r.is_supplier = true;
    })
}

// Inventory adjustment name
pub fn mock_name_invad() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = INVENTORY_ADJUSTMENT_NAME_CODE.to_string();
        r.name = String::from("Inventory adjustments");
        r.code = INVENTORY_ADJUSTMENT_NAME_CODE.to_string();
    })
}

pub fn mock_name_master_list_filter_test() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("id_master_list_filter_test");
        r.name = String::from("name_master_list_filter_test");
        r.code = String::from("master_list_filter_test");
        r.is_supplier = true;
    })
}

pub fn mock_patient() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("testId");
        r.name = String::from("testId");
        r.code = String::from("testId");
        r.is_customer = true;
    })
}

pub fn mock_patient_b() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("patient2");
        r.name = String::from("patient2");
        r.code = String::from("patient2");
        r.is_customer = true;
    })
}

pub fn mock_names() -> Vec<NameRow> {
    vec![
        mock_name_a(),
        mock_name_b(),
        mock_name_c(),
        mock_name_invad(),
        mock_name_master_list_filter_test(),
        mock_name_store_a(),
        mock_name_store_b(),
        mock_name_store_c(),
        mock_patient(),
        mock_patient_b(),
    ]
}
