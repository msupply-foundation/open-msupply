use crate::{db_diesel, mock::mock_store_a, PurchaseOrderRow};

pub fn mock_purchase_order_a() -> PurchaseOrderRow {
    PurchaseOrderRow {
        id: "test_purchase_order_a".to_string(),
        store_id: mock_store_a().id,
        status: db_diesel::purchase_order_row::PurchaseOrderStatus::New,
        supplier_name_link_id: "name_a".to_string(),
        purchase_order_number: 1234567890,
        ..Default::default()
    }
}

pub fn mock_purchase_order_b_finalised() -> PurchaseOrderRow {
    PurchaseOrderRow {
        id: "test_purchase_order_b_confirmed".to_string(),
        store_id: mock_store_a().id,
        status: db_diesel::purchase_order_row::PurchaseOrderStatus::Finalised,
        supplier_name_link_id: "name_a".to_string(),
        purchase_order_number: 9876543210,
        ..Default::default()
    }
}

pub fn mock_purchase_orders() -> Vec<PurchaseOrderRow> {
    vec![mock_purchase_order_a(), mock_purchase_order_b_finalised()]
}
