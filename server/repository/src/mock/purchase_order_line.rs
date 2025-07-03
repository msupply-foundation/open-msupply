use util::inline_init;

use crate::{mock::mock_purchase_order_a, PurchaseOrderLineRow};

pub fn mock_purchase_order_line_a() -> PurchaseOrderLineRow {
    inline_init(|r: &mut PurchaseOrderLineRow| {
        r.id = "test_purchase_order_line_a".to_string();
        r.purchase_order_id = mock_purchase_order_a().id;
    })
}

pub fn mock_purchase_order_line_b() -> PurchaseOrderLineRow {
    inline_init(|r: &mut PurchaseOrderLineRow| {
        r.id = "test_purchase_order_line_b".to_string();
        r.purchase_order_id = mock_purchase_order_a().id;
    })
}

pub fn mock_purchase_order_lines() -> Vec<PurchaseOrderLineRow> {
    vec![mock_purchase_order_line_a(), mock_purchase_order_line_b()]
}
