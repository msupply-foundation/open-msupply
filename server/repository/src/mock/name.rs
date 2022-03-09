use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;

use crate::schema::NameRow;

pub fn mock_name_store_a() -> NameRow {
    NameRow {
        id: String::from("name_store_a"),
        name: String::from("Store A"),
        code: String::from("code"),
        is_customer: false,
        is_supplier: true,
    }
}

pub fn mock_name_store_b() -> NameRow {
    NameRow {
        id: String::from("name_store_b"),
        name: String::from("Store B"),
        code: String::from("code"),
        is_customer: false,
        is_supplier: false,
    }
}

pub fn mock_name_store_c() -> NameRow {
    NameRow {
        id: String::from("name_store_c"),
        name: String::from("Store C"),
        code: String::from("code"),
        is_customer: false,
        is_supplier: true,
    }
}

pub fn mock_name_a() -> NameRow {
    NameRow {
        id: String::from("name_a"),
        name: String::from("name_a"),
        code: String::from("name_a"),
        is_customer: false,
        is_supplier: true,
    }
}

// Not visible in store_a
pub fn mock_name_b() -> NameRow {
    NameRow {
        id: String::from("name_b"),
        name: String::from("name_b"),
        code: String::from("name_b"),
        is_customer: false,
        is_supplier: true,
    }
}

// Inventory adjustment name
pub fn mock_name_invad() -> NameRow {
    NameRow {
        id: INVENTORY_ADJUSTMENT_NAME_CODE.to_string(),
        name: String::from("Inventory adjustments"),
        code: INVENTORY_ADJUSTMENT_NAME_CODE.to_string(),
        is_customer: false,
        is_supplier: false,
    }
}

pub fn mock_name_master_list_filter_test() -> NameRow {
    NameRow {
        id: String::from("id_master_list_filter_test"),
        name: String::from("name_master_list_filter_test"),
        code: String::from("master_list_filter_test"),
        is_customer: false,
        is_supplier: true,
    }
}

pub fn mock_names() -> Vec<NameRow> {
    vec![
        mock_name_store_a(),
        mock_name_b(),
        mock_name_store_b(),
        mock_name_store_c(),
        mock_name_a(),
        mock_name_invad(),
        mock_name_master_list_filter_test(),
    ]
}
