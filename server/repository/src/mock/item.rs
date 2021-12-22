use crate::schema::{ItemRow, ItemRowType as ItemType};

pub fn mock_item_a() -> ItemRow {
    ItemRow {
        id: String::from("item_a"),
        name: String::from("Item A"),
        code: String::from("item_a_code"),
        unit_id: None,
        r#type: ItemType::Stock,
    }
}

pub fn mock_item_b() -> ItemRow {
    ItemRow {
        id: String::from("item_b"),
        name: String::from("Item B"),
        code: String::from("item_b_code"),
        unit_id: None,
        r#type: ItemType::Stock,
    }
}

pub fn mock_item_c() -> ItemRow {
    ItemRow {
        id: String::from("item_c"),
        name: String::from("Item C"),
        code: String::from("item_c_code"),
        unit_id: None,
        r#type: ItemType::Stock,
    }
}

pub fn item_query_test1() -> ItemRow {
    ItemRow {
        id: String::from("item_query_test1"),
        name: String::from("name_item_query_test1"),
        code: String::from("code_item_query_test1"),
        unit_id: None,
        r#type: ItemType::Stock,
    }
}

pub fn item_query_test2() -> ItemRow {
    ItemRow {
        id: String::from("item_query_test2"),
        name: String::from("name_item_query_test2"),
        code: String::from("code_item_query_test2"),
        unit_id: Some("item_query_test2".to_owned()),
        r#type: ItemType::Stock,
    }
}

pub fn mock_item_service_item() -> ItemRow {
    ItemRow {
        id: String::from("mock_item_service_item"),
        name: String::from("name_mock_item_service_item"),
        code: String::from("code_mock_item_service_item"),
        unit_id: None,
        r#type: ItemType::Service,
    }
}

pub fn mock_items() -> Vec<ItemRow> {
    vec![
        mock_item_a(),
        mock_item_b(),
        mock_item_c(),
        item_query_test1(),
        item_query_test2(),
        mock_item_service_item(),
    ]
}
