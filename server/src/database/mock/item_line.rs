use crate::database::schema::ItemLineRow;

pub fn mock_item_line_a() -> ItemLineRow {
    ItemLineRow {
        id: String::from("item_a_line_a"),
        item_id: String::from("item_a"),
        store_id: String::from("store_a"),
        batch: String::from("item_a_batch_a"),
        quantity: 1.0,
    }
}

pub fn mock_item_line_b() -> ItemLineRow {
    ItemLineRow {
        id: String::from("item_a_line_b"),
        item_id: String::from("item_a"),
        store_id: String::from("store_a"),
        batch: String::from("item_a_batch_b"),
        quantity: 2.0,
    }
}

pub fn mock_item_line_c() -> ItemLineRow {
    ItemLineRow {
        id: String::from("item_b_line_a"),
        item_id: String::from("item_b"),
        store_id: String::from("store_a"),
        batch: String::from("item_b_batch_a"),
        quantity: 3.0,
    }
}
pub fn mock_item_line_d() -> ItemLineRow {
    ItemLineRow {
        id: String::from("item_b_line_b"),
        item_id: String::from("item_b"),
        store_id: String::from("store_a"),
        batch: String::from("item_b_batch_b"),
        quantity: 4.0,
    }
}
pub fn mock_item_line_e() -> ItemLineRow {
    ItemLineRow {
        id: String::from("item_c_line_a"),
        item_id: String::from("item_c"),
        store_id: String::from("store_a"),
        batch: String::from("item_c_batch_a"),
        quantity: 5.0,
    }
}

pub fn mock_item_line_f() -> ItemLineRow {
    ItemLineRow {
        id: String::from("item_c_line_b"),
        item_id: String::from("item_c"),
        store_id: String::from("store_a"),
        batch: String::from("item_c_batch_b"),
        quantity: 6.0,
    }
}

pub fn mock_item_lines() -> Vec<ItemLineRow> {
    vec![
        mock_item_line_a(),
        mock_item_line_b(),
        mock_item_line_c(),
        mock_item_line_d(),
        mock_item_line_e(),
        mock_item_line_f(),
    ]
}
