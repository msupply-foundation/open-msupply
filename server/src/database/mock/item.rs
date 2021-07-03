use crate::database::schema::{ItemRow, ItemRowType};

pub fn mock_item_a() -> ItemRow {
    ItemRow {
        id: String::from("item_a"),
        item_name: String::from("Item A"),
        type_of: ItemRowType::General,
    }
}

pub fn mock_item_b() -> ItemRow {
    ItemRow {
        id: String::from("item_b"),
        item_name: String::from("Item B"),
        type_of: ItemRowType::General,
    }
}

pub fn mock_item_c() -> ItemRow {
    ItemRow {
        id: String::from("item_c"),
        item_name: String::from("Item C"),
        type_of: ItemRowType::General,
    }
}

pub fn mock_items() -> Vec<ItemRow> {
    vec![mock_item_a(), mock_item_b(), mock_item_c()]
}
