use chrono::NaiveDateTime;

use crate::{
    goods_received_row::{GoodsReceivedRow, GoodsReceivedStatus},
    mock::{
        mock_purchase_order_b, mock_purchase_order_b_finalised, mock_purchase_order_e,
        mock_store_a, mock_store_b,
    },
};

pub fn mock_goods_received_a() -> GoodsReceivedRow {
    GoodsReceivedRow {
        id: "test_goods_received_a".to_string(),
        store_id: mock_store_b().id,
        goods_received_number: 1,
        created_datetime: NaiveDateTime::default(),
        status: GoodsReceivedStatus::Finalised,
        ..Default::default()
    }
}

pub fn mock_goods_received_linked_to_other_store_purchase_order() -> GoodsReceivedRow {
    GoodsReceivedRow {
        id: "test_goods_received_linked_to_other_store_purchase_order".to_string(),
        store_id: mock_store_a().id,
        purchase_order_id: Some(mock_purchase_order_e().id),
        goods_received_number: 2,
        status: GoodsReceivedStatus::Finalised,
        created_datetime: NaiveDateTime::default(),
        ..Default::default()
    }
}

pub fn mock_goods_received_new() -> GoodsReceivedRow {
    GoodsReceivedRow {
        id: "test_goods_received_new".to_string(),
        store_id: mock_store_a().id,
        purchase_order_id: Some(mock_purchase_order_b_finalised().id),
        status: GoodsReceivedStatus::New,
        goods_received_number: 3,
        created_datetime: NaiveDateTime::default(),
        ..Default::default()
    }
}

pub fn mock_goods_received_linked_to_not_finalised_purchase_order() -> GoodsReceivedRow {
    GoodsReceivedRow {
        id: "test_goods_received_linked_to_not_finalised_purchase_order".to_string(),
        store_id: mock_store_a().id,
        purchase_order_id: Some(mock_purchase_order_b().id),
        goods_received_number: 4,
        status: GoodsReceivedStatus::Finalised,
        created_datetime: NaiveDateTime::default(),
        ..Default::default()
    }
}

pub fn mock_goods_received_without_linked_purchase_order() -> GoodsReceivedRow {
    GoodsReceivedRow {
        id: "test_goods_received_without_linked_purchase_order".to_string(),
        store_id: mock_store_a().id,
        purchase_order_id: None,
        goods_received_number: 5,
        status: GoodsReceivedStatus::Finalised,
        created_datetime: NaiveDateTime::default(),
        ..Default::default()
    }
}

pub fn mock_goods_received_without_linked_purchase_order_lines() -> GoodsReceivedRow {
    GoodsReceivedRow {
        id: "test_goods_received_without_linked_purchase_order_lines".to_string(),
        store_id: mock_store_a().id,
        purchase_order_id: None,
        goods_received_number: 6,
        created_datetime: NaiveDateTime::default(),
        ..Default::default()
    }
}

pub fn mock_goods_received() -> Vec<GoodsReceivedRow> {
    vec![
        mock_goods_received_a(),
        mock_goods_received_without_linked_purchase_order(),
        mock_goods_received_linked_to_other_store_purchase_order(),
        mock_goods_received_linked_to_not_finalised_purchase_order(),
        mock_goods_received_new(),
    ]
}
