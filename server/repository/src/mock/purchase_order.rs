use util::inline_init;

use crate::{db_diesel, mock::mock_store_a, PurchaseOrderRow};

pub fn mock_purchase_order_a() -> PurchaseOrderRow {
    inline_init(|r: &mut PurchaseOrderRow| {
        r.id = "test_purchase_order_a".to_string();
        r.store_id = mock_store_a().id;
        r.status = db_diesel::purchase_order_row::PurchaseOrderStatus::New;
        r.supplier_name_link_id = Some("name_a".to_string());
        r.purchase_order_number = 1234567890;
    })
}

pub fn mock_purchase_order_b() -> PurchaseOrderRow {
    inline_init(|r: &mut PurchaseOrderRow| {
        r.id = "test_purchase_order_b".to_string();
        r.store_id = mock_store_a().id;
        r.status = db_diesel::purchase_order_row::PurchaseOrderStatus::New;
        r.supplier_name_link_id = Some("name_a".to_string());
        r.purchase_order_number = 9876543210;
    })
}

pub fn mock_purchase_orders() -> Vec<PurchaseOrderRow> {
    vec![mock_purchase_order_a(), mock_purchase_order_b()]
}
