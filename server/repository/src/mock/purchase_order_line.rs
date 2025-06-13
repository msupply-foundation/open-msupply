use util::inline_init;

use crate::PurchaseOrderLineRow;

pub fn mock_purchase_order_line_a() -> PurchaseOrderLineRow {
    inline_init(|r: &mut PurchaseOrderLineRow| {
        r.id = "test_purchase_order_line_a".to_string();
        r.purchase_order_id = "test_purchase_order_a".to_string();
    })
}

pub fn mock_purchase_order_line_b() -> PurchaseOrderLineRow {
    inline_init(|r: &mut PurchaseOrderLineRow| {
        r.id = "test_purchase_order_line_b".to_string();
        r.purchase_order_id = "test_purchase_order_a".to_string();
    })
}
