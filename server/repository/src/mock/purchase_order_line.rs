use crate::{
    mock::{mock_item_a, mock_item_b, mock_purchase_order_a, mock_purchase_order_b_finalised},
    PurchaseOrderLineRow,
};

pub fn mock_purchase_order_a_line_1() -> PurchaseOrderLineRow {
    PurchaseOrderLineRow {
        id: "test_purchase_order_a_line_1".to_string(),
        purchase_order_id: mock_purchase_order_a().id,
        store_id: "store_a".to_string(),
        line_number: 1,
        item_link_id: mock_item_a().id,
        ..Default::default()
    }
}

pub fn mock_purchase_order_a_line_2() -> PurchaseOrderLineRow {
    PurchaseOrderLineRow {
        id: "test_purchase_order_a_line_2".to_string(),
        store_id: "store_a".to_string(),
        purchase_order_id: mock_purchase_order_a().id,
        line_number: 1,
        item_link_id: mock_item_b().id,
        ..Default::default()
    }
}

pub fn mock_purchase_order_b_line_1() -> PurchaseOrderLineRow {
    PurchaseOrderLineRow {
        id: "test_purchase_order_b_line_1".to_string(),
        store_id: "store_a".to_string(),
        purchase_order_id: mock_purchase_order_b_finalised().id,
        line_number: 1,
        item_link_id: mock_item_a().id,
        ..Default::default()
    }
}

pub fn mock_purchase_order_lines() -> Vec<PurchaseOrderLineRow> {
    vec![
        mock_purchase_order_a_line_1(),
        mock_purchase_order_a_line_2(),
        mock_purchase_order_b_line_1(),
    ]
}
