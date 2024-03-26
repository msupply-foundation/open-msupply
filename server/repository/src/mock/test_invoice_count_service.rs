use chrono::NaiveDate;
use util::inline_init;

use crate::{InvoiceRow, InvoiceRowStatus, InvoiceRowType};

use super::MockData;

pub fn mock_inbound_shipment_invoice_count_service_a() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("inbound_shipment_invoice_count_a");
        r.name_link_id = String::from("name_store_b");
        r.store_id = String::from("store_a");
        r.invoice_number = 4;
        r.r#type = InvoiceRowType::InboundShipment;
        r.status = InvoiceRowStatus::New;
        r.comment = Some("Sort comment test Ac".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 12, 7)
            .unwrap()
            .and_hms_milli_opt(13, 30, 0, 0)
            .unwrap();
        r.currency_id = "currency_a".to_string();
    })
}

pub fn mock_inbound_shipment_invoice_count_service_b() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("inbound_shipment_invoice_count_b");
        r.name_link_id = String::from("name_store_b");
        r.store_id = String::from("store_a");
        r.invoice_number = 4;
        r.r#type = InvoiceRowType::InboundShipment;
        r.status = InvoiceRowStatus::New;
        r.comment = Some("Sort comment test Ac".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 12, 8)
            .unwrap()
            .and_hms_milli_opt(8, 30, 0, 0)
            .unwrap();
        r.currency_id = "currency_a".to_string();
    })
}

pub fn test_invoice_count_service_data() -> MockData {
    let mut data: MockData = Default::default();
    data.invoices.append(&mut vec![
        mock_inbound_shipment_invoice_count_service_a(),
        mock_inbound_shipment_invoice_count_service_b(),
    ]);
    data
}
