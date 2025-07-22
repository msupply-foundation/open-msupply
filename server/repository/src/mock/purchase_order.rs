use util::inline_init;

use crate::{db_diesel, mock::mock_store_a, PurchaseOrderRow};

pub fn mock_purchase_order_a() -> PurchaseOrderRow {
    inline_init(|r: &mut PurchaseOrderRow| {
        r.id = "test_purchase_order_a".to_string();
        r.store_id = mock_store_a().id;
        r.status = db_diesel::purchase_order_row::PurchaseOrderStatus::New;
    })
}

pub fn mock_purchase_order_b() -> PurchaseOrderRow {
    inline_init(|r: &mut PurchaseOrderRow| {
        r.id = "test_purchase_order_b".to_string();
        r.store_id = mock_store_a().id;
        r.status = db_diesel::purchase_order_row::PurchaseOrderStatus::New;
    })
}
