use crate::{
    db_diesel,
    mock::{mock_store_a, mock_store_b},
    GoodsReceivedLineRow,
};

pub fn mock_goods_received_line_a() -> GoodsReceivedLineRow {
    GoodsReceivedLineRow {
        id: "test_goods_received_a".to_string(),
        ..Default::default()
    }
}

pub fn mock_goods_received_line_b() -> GoodsReceivedLineRow {
    GoodsReceivedLineRow {
        id: "test_goods_received_b".to_string(),
        ..Default::default()
    }
}

pub fn mock_goods_received_line_without_po_line() -> GoodsReceivedLineRow {
    GoodsReceivedLineRow {
        id: "test_goods_received_without_linked_purchase_order".to_string(),
        purchase_order_line_id: "non_existent_po_line".to_string(),
        ..Default::default()
    }
}

pub fn mock_goods_received_lines() -> Vec<GoodsReceivedLineRow> {
    vec![
        mock_goods_received_line_a(),
        mock_goods_received_line_without_po_line(),
    ]
}
