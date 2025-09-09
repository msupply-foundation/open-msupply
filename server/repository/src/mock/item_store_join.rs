use crate::{
    mock::{mock_item_a, mock_store_a},
    ItemStoreJoinRow,
};

pub fn mock_item_a_join_store_a() -> ItemStoreJoinRow {
    ItemStoreJoinRow {
        id: "item_a_store_a".to_string(),
        item_link_id: mock_item_a().id.clone(),
        store_id: mock_store_a().id.clone(),
        default_sell_price_per_pack: 100.0,
        ignore_for_orders: false,
    }
}

pub fn mock_item_query_test1_join_store_() -> ItemStoreJoinRow {
    ItemStoreJoinRow {
        id: "item_query_test1_store_a".to_string(),
        item_link_id: "item_query_test1".to_string(),
        store_id: mock_store_a().id.clone(),
        default_sell_price_per_pack: 50.0,
        ignore_for_orders: false,
    }
}

pub fn mock_item_store_joins() -> Vec<ItemStoreJoinRow> {
    vec![
        mock_item_a_join_store_a(),
        mock_item_query_test1_join_store_(),
    ]
}
