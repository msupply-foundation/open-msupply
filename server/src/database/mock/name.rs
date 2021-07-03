use crate::database::schema::NameRow;

pub fn mock_name_store_a() -> NameRow {
    NameRow {
        id: String::from("name_store_a"),
        name: String::from("Store A"),
    }
}

pub fn mock_name_store_b() -> NameRow {
    NameRow {
        id: String::from("name_store_b"),
        name: String::from("Store B"),
    }
}

pub fn mock_name_store_c() -> NameRow {
    NameRow {
        id: String::from("name_store_c"),
        name: String::from("Store C"),
    }
}

pub fn mock_store_names() -> Vec<NameRow> {
    vec![
        mock_name_store_a(),
        mock_name_store_b(),
        mock_name_store_c(),
    ]
}

pub fn mock_names() -> Vec<NameRow> {
    vec![
        mock_name_store_a(),
        mock_name_store_b(),
        mock_name_store_c(),
    ]
}
