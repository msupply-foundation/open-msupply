use util::inline_init;

use crate::{ItemLinkRow, ItemRow, ItemType};

pub fn mock_item_link_from_item(item: &ItemRow) -> ItemLinkRow {
    inline_init(|r: &mut ItemLinkRow| {
        r.id.clone_from(&item.id);
        r.item_id.clone_from(&item.id);
    })
}

pub fn mock_item_a() -> ItemRow {
    inline_init(|r: &mut ItemRow| {
        r.id = String::from("item_a");
        r.name = String::from("Item A");
        r.code = String::from("item_a_code");
        r.r#type = ItemType::Stock;
    })
}

pub fn mock_item_b() -> ItemRow {
    inline_init(|r: &mut ItemRow| {
        r.id = String::from("item_b");
        r.name = String::from("Item B");
        r.code = String::from("item_b_code");
        r.r#type = ItemType::Stock;
    })
}

pub fn mock_item_c() -> ItemRow {
    inline_init(|r: &mut ItemRow| {
        r.id = String::from("item_c");
        r.name = String::from("Item C");
        r.code = String::from("item_c_code");
        r.r#type = ItemType::Stock;
    })
}
pub fn mock_item_d() -> ItemRow {
    inline_init(|r: &mut ItemRow| {
        r.id = String::from("item_d");
        r.name = String::from("Item E");
        r.code = String::from("item_d_code");
        r.r#type = ItemType::Stock;
    })
}

pub fn mock_item_e() -> ItemRow {
    let id = "item_e".to_string();
    inline_init(|r: &mut ItemRow| {
        r.id.clone_from(&id);
        r.name.clone_from(&id);
        r.code.clone_from(&id);
        r.r#type = ItemType::Stock;
    })
}

pub fn mock_item_f() -> ItemRow {
    let id = "item_f".to_string();
    inline_init(|r: &mut ItemRow| {
        r.id.clone_from(&id);
        r.name.clone_from(&id);
        r.code.clone_from(&id);
        r.r#type = ItemType::Stock;
        r.default_pack_size = 1.0;
    })
}

pub fn mock_item_g() -> ItemRow {
    let id = "item_g".to_string();
    inline_init(|r: &mut ItemRow| {
        r.id.clone_from(&id);
        r.name.clone_from(&id);
        r.code.clone_from(&id);
        r.r#type = ItemType::Stock;
        r.default_pack_size = 1.0;
    })
}

pub fn mock_vaccine_item_a() -> ItemRow {
    let id = "vaccine_item_a".to_string();
    inline_init(|r: &mut ItemRow| {
        r.id.clone_from(&id);
        r.name.clone_from(&id);
        r.code.clone_from(&id);
        r.r#type = ItemType::Stock;
        r.is_vaccine = true;
        r.vaccine_doses = 2;
    })
}

pub fn item_query_test1() -> ItemRow {
    inline_init(|r: &mut ItemRow| {
        r.id = String::from("item_query_test1");
        r.name = String::from("name_item_query_test1");
        r.code = String::from("code_item_query_test1");
        r.r#type = ItemType::Stock;
    })
}

pub fn item_query_test2() -> ItemRow {
    inline_init(|r: &mut ItemRow| {
        r.id = String::from("item_query_test2");
        r.name = String::from("name_item_query_test2");
        r.code = String::from("code_item_query_test2");
        r.unit_id = Some("item_query_test2".to_owned());
        r.default_pack_size = 1.0;
        r.r#type = ItemType::Stock;
    })
}

pub fn mock_item_service_item() -> ItemRow {
    inline_init(|r: &mut ItemRow| {
        r.id = String::from("mock_item_service_item");
        r.name = String::from("name_mock_item_service_item");
        r.code = String::from("code_mock_item_service_item");
        r.r#type = ItemType::Service;
    })
}

pub fn mock_default_service_item() -> ItemRow {
    inline_init(|r: &mut ItemRow| {
        r.id = String::from("default_service_item");
        r.name = String::from("Service charge");
        r.code = String::from("service");
        r.r#type = ItemType::Service;
    })
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
    ]
}
