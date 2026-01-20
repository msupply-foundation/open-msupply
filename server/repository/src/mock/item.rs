use crate::{ItemLinkRow, ItemRow, ItemType};

pub fn mock_item_link_from_item(item: &ItemRow) -> ItemLinkRow {
    ItemLinkRow {
        id: item.id.clone(),
        item_id: item.id.clone(),
    }
}

pub fn mock_item_a() -> ItemRow {
    ItemRow {
        id: String::from("item_a"),
        name: String::from("Item A"),
        code: String::from("item_a_code"),
        r#type: ItemType::Stock,
        ..Default::default()
    }
}

pub fn mock_item_b() -> ItemRow {
    ItemRow {
        id: String::from("item_b"),
        name: String::from("Item B"),
        code: String::from("item_b_code"),
        r#type: ItemType::Stock,
        ..Default::default()
    }
}

pub fn mock_item_c() -> ItemRow {
    ItemRow {
        id: String::from("item_c"),
        name: String::from("Item C"),
        code: String::from("item_c_code"),
        r#type: ItemType::Stock,
        ..Default::default()
    }
}
pub fn mock_item_d() -> ItemRow {
    ItemRow {
        id: String::from("item_d"),
        name: String::from("Item E"),
        code: String::from("item_d_code"),
        r#type: ItemType::Stock,
        ..Default::default()
    }
}

pub fn mock_item_e() -> ItemRow {
    let id = "item_e".to_string();
    ItemRow {
        id: id.clone(),
        name: id.clone(),
        code: id.clone(),
        r#type: ItemType::Stock,
        ..Default::default()
    }
}

pub fn mock_item_f() -> ItemRow {
    let id = "item_f".to_string();
    ItemRow {
        id: id.clone(),
        name: id.clone(),
        code: id.clone(),
        r#type: ItemType::Stock,
        default_pack_size: 1.0,
        ..Default::default()
    }
}

pub fn mock_item_g() -> ItemRow {
    let id = "item_g".to_string();
    ItemRow {
        id: id.clone(),
        name: id.clone(),
        code: id.clone(),
        r#type: ItemType::Stock,
        default_pack_size: 1.0,
        ..Default::default()
    }
}

pub fn mock_vaccine_item_a() -> ItemRow {
    let id = "vaccine_item_a".to_string();
    ItemRow {
        id: id.clone(),
        name: id.clone(),
        code: id.clone(),
        r#type: ItemType::Stock,
        is_vaccine: true,
        vaccine_doses: 2,
        ..Default::default()
    }
}

pub fn item_query_test1() -> ItemRow {
    ItemRow {
        id: String::from("item_query_test1"),
        name: String::from("name_item_query_test1"),
        code: String::from("code_item_query_test1"),
        r#type: ItemType::Stock,
        ..Default::default()
    }
}

pub fn item_query_test2() -> ItemRow {
    ItemRow {
        id: String::from("item_query_test2"),
        name: String::from("name_item_query_test2"),
        code: String::from("code_item_query_test2"),
        unit_id: Some("item_query_test2".to_string()),
        default_pack_size: 1.0,
        r#type: ItemType::Stock,
        ..Default::default()
    }
}

pub fn mock_item_service_item() -> ItemRow {
    ItemRow {
        id: String::from("mock_item_service_item"),
        name: String::from("name_mock_item_service_item"),
        code: String::from("code_mock_item_service_item"),
        r#type: ItemType::Service,
        ..Default::default()
    }
}

pub fn mock_default_service_item() -> ItemRow {
    ItemRow {
        id: String::from("default_service_item"),
        name: String::from("Service charge"),
        code: String::from("service"),
        r#type: ItemType::Service,
        ..Default::default()
    }
}

pub fn mock_item_restricted_location_type_b() -> ItemRow {
    ItemRow {
        id: String::from("restricted_location_type_item"),
        name: String::from("name_restricted_location_type_item"),
        code: String::from("restricted_location_type"),
        r#type: ItemType::Stock,
        restricted_location_type_id: Some(String::from("location_type_b_id")),
        ..Default::default()
    }
}

pub fn mock_items() -> Vec<ItemRow> {
    vec![
        mock_item_a(),
        mock_item_b(),
        mock_item_c(),
        mock_item_d(),
        mock_item_e(),
        mock_item_f(),
        mock_item_g(),
        mock_vaccine_item_a(),
        item_query_test1(),
        item_query_test2(),
        mock_item_service_item(),
        mock_default_service_item(),
        mock_item_restricted_location_type_b(),
    ]
}
