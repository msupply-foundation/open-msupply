use util::inline_init;

use crate::{
    mock::{mock_item_a, mock_item_b, mock_purchase_order_a, mock_purchase_order_b_finalised},
    PurchaseOrderLineRow,
};

pub fn mock_purchase_order_a_line_1() -> PurchaseOrderLineRow {
    inline_init(|r: &mut PurchaseOrderLineRow| {
        r.id = "test_purchase_order_a_line_1".to_string();
        r.purchase_order_id = mock_purchase_order_a().id;
        r.store_id = "store_a".to_string();
        r.line_number = 1;
        r.item_link_id = mock_item_a().id;
    })
}

pub fn mock_purchase_order_a_line_2() -> PurchaseOrderLineRow {
    inline_init(|r: &mut PurchaseOrderLineRow| {
        r.id = "test_purchase_order_a_line_2".to_string();
        r.store_id = "store_a".to_string();
        r.purchase_order_id = mock_purchase_order_a().id;
        r.line_number = 1;
        r.item_link_id = mock_item_b().id;
    })
}

pub fn mock_purchase_order_b_line_1() -> PurchaseOrderLineRow {
    inline_init(|r: &mut PurchaseOrderLineRow| {
        r.id = "test_purchase_order_b_line_1".to_string();
        r.store_id = "store_a".to_string();
        r.purchase_order_id = mock_purchase_order_b_finalised().id;
        r.line_number = 1;
        r.item_link_id = mock_item_a().id;
    })
}

pub fn mock_purchase_order_lines() -> Vec<PurchaseOrderLineRow> {
    vec![
        mock_purchase_order_a_line_1(),
        mock_purchase_order_a_line_2(),
        mock_purchase_order_b_line_1(),
    ]
}
