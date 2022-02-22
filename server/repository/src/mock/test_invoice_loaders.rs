use chrono::NaiveDate;

use crate::schema::{
    InvoiceRow, InvoiceRowStatus, InvoiceRowType, RequisitionRow, RequisitionRowStatus,
    RequisitionRowType,
};

use super::{mock_name_store_b, mock_store_a, MockData};

pub fn mock_test_invoice_loaders() -> MockData {
    let mut result = MockData::default();
    result.invoices.push(mock_invoice_loader_invoice1());
    result.invoices.push(mock_invoice_loader_invoice2());
    result.requisitions.push(mock_invoice_loader_requistion1());
    result
}

pub fn mock_invoice_loader_requistion1() -> RequisitionRow {
    RequisitionRow {
        id: "mock_invoice_loader_requistion1".to_owned(),
        requisition_number: 1,
        name_id: "name_a".to_owned(),
        store_id: mock_store_a().id,
        r#type: RequisitionRowType::Request,
        status: RequisitionRowStatus::Draft,
        created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
        sent_datetime: None,
        finalised_datetime: None,
        colour: None,
        comment: None,
        their_reference: None,
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        linked_requisition_id: None,
    }
}

pub fn mock_invoice_loader_invoice1() -> InvoiceRow {
    InvoiceRow {
        id: "mock_invoice_loader_invoice1".to_string(),
        name_id: mock_name_store_b().id,
        store_id: mock_store_a().id,
        invoice_number: 1,
        requisition_id: Some(mock_invoice_loader_requistion1().id),
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Picked,
        on_hold: false,
        name_store_id: None,
        comment: None,
        their_reference: None,
        created_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
        allocated_datetime: None,
        shipped_datetime: None,
        colour: None,
        linked_invoice_id: None,
        picked_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    }
}

pub fn mock_invoice_loader_invoice2() -> InvoiceRow {
    InvoiceRow {
        id: "mock_invoice_loader_invoice2".to_string(),
        name_id: mock_name_store_b().id,
        store_id: mock_store_a().id,
        invoice_number: 1,
        requisition_id: None,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Picked,
        on_hold: false,
        name_store_id: None,
        comment: None,
        their_reference: None,
        created_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
        allocated_datetime: None,
        shipped_datetime: None,
        colour: None,
        linked_invoice_id: Some(mock_invoice_loader_invoice1().id),
        picked_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    }
}
