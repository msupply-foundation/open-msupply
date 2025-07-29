use util::inline_init;

use crate::{
    db_diesel,
    mock::{mock_store_a, mock_store_b},
    PurchaseOrderRow,
};

pub fn mock_purchase_order_a() -> PurchaseOrderRow {
    inline_init(|r: &mut PurchaseOrderRow| {
        r.id = "test_purchase_order_a".to_string();
        r.store_id = mock_store_a().id;
        r.status = db_diesel::purchase_order_row::PurchaseOrderStatus::New;
        r.supplier_name_link_id = "name_a".to_string();
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

pub fn mock_purchase_order_b_finalised() -> PurchaseOrderRow {
    inline_init(|r: &mut PurchaseOrderRow| {
        r.id = "test_purchase_order_b_confirmed".to_string();
        r.store_id = mock_store_a().id;
        r.status = db_diesel::purchase_order_row::PurchaseOrderStatus::Finalised;
        r.supplier_name_link_id = "name_a".to_string();
        r.purchase_order_number = 9876543210;
    })
}

pub fn mock_purchase_order_c() -> PurchaseOrderRow {
    inline_init(|r: &mut PurchaseOrderRow| {
        r.id = "test_purchase_order_c".to_string();
        r.store_id = mock_store_a().id;
        r.status = db_diesel::purchase_order_row::PurchaseOrderStatus::Finalised;
        r.supplier_name_link_id = Some("name_a".to_string());
        r.purchase_order_number = 3;
    })
}

pub fn mock_purchase_order_d() -> PurchaseOrderRow {
    inline_init(|r: &mut PurchaseOrderRow| {
        r.id = "test_purchase_order_d".to_string();
        r.store_id = mock_store_b().id;
        r.status = db_diesel::purchase_order_row::PurchaseOrderStatus::New;
        r.supplier_name_link_id = Some("name_a".to_string());
        r.purchase_order_number = 3;
    })
}

pub fn mock_purchase_orders() -> Vec<PurchaseOrderRow> {
    vec![
        mock_purchase_order_a(),
        mock_purchase_order_b(),
        mock_purchase_order_b_finalised(),
        mock_purchase_order_c(),
        mock_purchase_order_d(),
    ]
}
