use crate::{
    goods_received_row::{GoodsReceivedRow, GoodsReceivedStatus},
    mock::{mock_purchase_order_b, mock_store_a, mock_store_b},
};

pub fn mock_goods_received_a() -> GoodsReceivedRow {
    GoodsReceivedRow {
        id: "test_goods_received_a".to_string(),
        store_id: mock_store_a().id,
        ..Default::default()
    }
}

pub fn mock_goods_received_b() -> GoodsReceivedRow {
    GoodsReceivedRow {
        id: "test_goods_received_b".to_string(),
        store_id: mock_store_b().id,
        ..Default::default()
    }
}

pub fn mock_goods_received_linked_to_other_store_purchase_order() -> GoodsReceivedRow {
    GoodsReceivedRow {
        id: "test_goods_received_linked_to_other_store_purchase_order".to_string(),
        store_id: mock_store_a().id,
        purchase_order_id: Some(mock_purchase_order_b().id),
        ..Default::default()
    }
}

pub fn mock_goods_received_new() -> GoodsReceivedRow {
    GoodsReceivedRow {
        id: "test_goods_received_new".to_string(),
        store_id: mock_store_a().id,
        status: GoodsReceivedStatus::New,
        ..Default::default()
    }
}

pub fn mock_goods_received_linked_to_not_finalised_purchase_order() -> GoodsReceivedRow {
    GoodsReceivedRow {
        id: "test_goods_received_linked_to_not_finalised_purchase_order".to_string(),
        store_id: mock_store_a().id,
        purchase_order_id: Some(mock_purchase_order_b().id),
        ..Default::default()
    }
}

pub fn mock_goods_received_without_linked_purchase_order() -> GoodsReceivedRow {
    GoodsReceivedRow {
        id: "test_goods_received_without_linked_purchase_order".to_string(),
        store_id: mock_store_a().id,
        purchase_order_id: None,
        ..Default::default()
    }
}

pub fn mock_goods_received_without_linked_purchase_order_lines() -> GoodsReceivedRow {
    GoodsReceivedRow {
        id: "test_goods_received_without_linked_purchase_order_lines".to_string(),
        store_id: mock_store_a().id,
        purchase_order_id: None,
        ..Default::default()
    }
}

pub fn mock_goods_received() -> Vec<GoodsReceivedRow> {
    vec![
        mock_goods_received_a(),
        mock_goods_received_b(),
        mock_goods_received_without_linked_purchase_order(),
        mock_goods_received_linked_to_other_store_purchase_order(),
        mock_goods_received_linked_to_not_finalised_purchase_order(),
        mock_goods_received_new(),
    ]
}
