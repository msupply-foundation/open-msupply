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
        is_supplier: true,
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

pub fn mock_names() -> Vec<NameRow> {
    vec![
        mock_name_store_a(),
        mock_name_store_b(),
        mock_name_store_c(),
        mock_name_a(),
    ]
}
