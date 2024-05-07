use chrono::NaiveDate;
use util::inline_init;

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
    inline_init(|r: &mut RequisitionRow| {
        r.id = "mock_invoice_loader_requisition1".to_owned();
        r.requisition_number = 1;
        r.name_link_id = "name_a".to_owned();
        r.store_id = mock_store_a().id;
        r.r#type = RequisitionType::Request;
        r.status = RequisitionStatus::Draft;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        r.max_months_of_stock = 1.0;
        r.min_months_of_stock = 0.9;
    })
}

pub fn mock_invoice_loader_invoice1() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "mock_invoice_loader_invoice1".to_string();
        r.name_link_id = mock_name_store_b().id;
        r.store_id = mock_store_a().id;
        r.invoice_number = 1;
        r.requisition_id = Some(mock_invoice_loader_requisition1().id);
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::Picked;
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_invoice_loader_invoice2() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "mock_invoice_loader_invoice2".to_string();
        r.name_link_id = mock_name_store_b().id;
        r.store_id = mock_store_a().id;
        r.invoice_number = 1;
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::Picked;
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap();
        r.linked_invoice_id = Some(mock_invoice_loader_invoice1().id);
    })
}
