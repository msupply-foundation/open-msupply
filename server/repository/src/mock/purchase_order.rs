use crate::{
    db_diesel,
    mock::{mock_store_a, mock_store_b},
    PurchaseOrderRow,
};

pub fn mock_purchase_order_a() -> PurchaseOrderRow {
    PurchaseOrderRow {
        id: "test_purchase_order_a".to_string(),
        store_id: mock_store_a().id,
        status: db_diesel::purchase_order_row::PurchaseOrderStatus::New,
        supplier_name_id: "name_a".to_string(),
        purchase_order_number: 1234567890,
        foreign_exchange_rate: Some(1.00),
        ..Default::default()
    }
}

pub fn mock_purchase_order_b() -> PurchaseOrderRow {
    PurchaseOrderRow {
        id: "test_purchase_order_b".to_string(),
        store_id: mock_store_a().id,
        status: db_diesel::purchase_order_row::PurchaseOrderStatus::New,
        supplier_name_id: "name_a".to_string(),
        purchase_order_number: 9876543210,
        foreign_exchange_rate: Some(1.00),
        ..Default::default()
    }
}

pub fn mock_purchase_order_b_finalised() -> PurchaseOrderRow {
    PurchaseOrderRow {
        id: "test_purchase_order_b_confirmed".to_string(),
        store_id: mock_store_a().id,
        status: db_diesel::purchase_order_row::PurchaseOrderStatus::Finalised,
        supplier_name_id: "name_a".to_string(),
        purchase_order_number: 9876543210,
        foreign_exchange_rate: Some(1.00),
        ..Default::default()
    }
}

pub fn mock_purchase_order_c() -> PurchaseOrderRow {
    PurchaseOrderRow {
        id: "test_purchase_order_c".to_string(),
        store_id: mock_store_a().id,
        status: db_diesel::purchase_order_row::PurchaseOrderStatus::Finalised,
        supplier_name_id: "name_a".to_string(),
        purchase_order_number: 3,
        foreign_exchange_rate: Some(1.00),
        ..Default::default()
    }
}

pub fn mock_purchase_order_d() -> PurchaseOrderRow {
    PurchaseOrderRow {
        id: "test_purchase_order_d".to_string(),
        store_id: mock_store_b().id,
        status: db_diesel::purchase_order_row::PurchaseOrderStatus::New,
        supplier_name_id: "name_a".to_string(),
        purchase_order_number: 3,
        foreign_exchange_rate: Some(1.00),
        ..Default::default()
    }
}

pub fn mock_purchase_order_e() -> PurchaseOrderRow {
    PurchaseOrderRow {
        id: "test_purchase_order_e".to_string(),
        store_id: mock_store_b().id,
        status: db_diesel::purchase_order_row::PurchaseOrderStatus::Finalised,
        supplier_name_id: "name_a".to_string(),
        purchase_order_number: 3,
        ..Default::default()
    }
}

pub fn mock_purchase_orders() -> Vec<PurchaseOrderRow> {
    vec![
        mock_purchase_order_a(),
        mock_purchase_order_b(),
        mock_purchase_order_b_finalised(),
        mock_purchase_order_c(),
        mock_purchase_order_d(),
        mock_purchase_order_e(),
    ]
}
