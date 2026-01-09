use chrono::NaiveDate;

use crate::{
    requisition_row::{RequisitionStatus, RequisitionType},
    InvoiceRow, InvoiceStatus, InvoiceType, RequisitionRow,
};

use super::{mock_name_store_b, mock_store_a, MockData};

pub fn mock_test_invoice_loaders() -> MockData {
    let mut result = MockData::default();
    result.invoices.push(mock_invoice_loader_invoice1());
    result.invoices.push(mock_invoice_loader_invoice2());
    result.requisitions.push(mock_invoice_loader_requisition1());
    result
}

pub fn mock_invoice_loader_requisition1() -> RequisitionRow {
    RequisitionRow {
        id: "mock_invoice_loader_requisition1".to_string(),
        requisition_number: 1,
        name_id: "name_a".to_string(),
        store_id: mock_store_a().id,
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Draft,
        created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        ..Default::default()
    }
}

pub fn mock_invoice_loader_invoice1() -> InvoiceRow {
    InvoiceRow {
        id: "mock_invoice_loader_invoice1".to_string(),
        name_id: mock_name_store_b().id,
        store_id: mock_store_a().id,
        invoice_number: 1,
        requisition_id: Some(mock_invoice_loader_requisition1().id),
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::Picked,
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_invoice_loader_invoice2() -> InvoiceRow {
    InvoiceRow {
        id: "mock_invoice_loader_invoice2".to_string(),
        name_id: mock_name_store_b().id,
        store_id: mock_store_a().id,
        invoice_number: 1,
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::Picked,
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap(),
        linked_invoice_id: Some(mock_invoice_loader_invoice1().id),
        ..Default::default()
    }
}
