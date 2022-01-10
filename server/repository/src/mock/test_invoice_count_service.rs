use chrono::NaiveDate;

use crate::schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType};

use super::MockData;

pub fn mock_inbound_shipment_invoice_count_service_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_invoice_count_a"),
        name_id: String::from("name_store_b"),
        store_id: String::from("store_a"),
        invoice_number: 4,
        name_store_id: None,
        r#type: InvoiceRowType::InboundShipment,
        status: InvoiceRowStatus::New,
        on_hold: false,
        comment: Some("Sort comment test Ac".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(2021, 12, 7).and_hms_milli(13, 30, 0, 0),
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
        color: None,
    }
}

pub fn mock_inbound_shipment_invoice_count_service_b() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_invoice_count_b"),
        name_id: String::from("name_store_b"),
        store_id: String::from("store_a"),
        invoice_number: 4,
        name_store_id: None,
        r#type: InvoiceRowType::InboundShipment,
        status: InvoiceRowStatus::New,
        on_hold: false,
        comment: Some("Sort comment test Ac".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(2021, 12, 8).and_hms_milli(8, 30, 0, 0),
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
        color: None,
    }
}

pub fn test_invoice_count_service_data() -> MockData {
    let mut data: MockData = Default::default();
    data.invoices.append(&mut vec![
        mock_inbound_shipment_invoice_count_service_a(),
        mock_inbound_shipment_invoice_count_service_b(),
    ]);
    data
}
