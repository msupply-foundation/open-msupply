use chrono::NaiveDate;

use crate::{InvoiceRow, InvoiceStatus, InvoiceType};

use super::MockData;

pub fn mock_inbound_shipment_invoice_count_service_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_invoice_count_a"),
        name_id: String::from("name_store_b"),
        store_id: String::from("store_a"),
        invoice_number: 4,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::New,
        comment: Some("Sort comment test Ac".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(2021, 12, 7)
            .unwrap()
            .and_hms_milli_opt(13, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_inbound_shipment_invoice_count_service_b() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_invoice_count_b"),
        name_id: String::from("name_store_b"),
        store_id: String::from("store_a"),
        invoice_number: 4,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::New,
        comment: Some("Sort comment test Ac".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(2021, 12, 8)
            .unwrap()
            .and_hms_milli_opt(8, 30, 0, 0)
            .unwrap(),
        ..Default::default()
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
