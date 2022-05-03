use chrono::{NaiveDate, Utc};
use util::inline_init;

use crate::{InvoiceRow, InvoiceRowStatus, InvoiceRowType};

pub fn mock_outbound_shipment_a() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_a");
        r.name_id = String::from("name_store_a");
        r.store_id = String::from("store_b");
        r.invoice_number = 1;
        r.r#type = InvoiceRowType::OutboundShipment;
        r.status = InvoiceRowStatus::Picked;
        r.comment = Some("Sort comment test ab".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0);
        r.picked_datetime = Some(Utc::now().naive_utc());
    })
}

pub fn mock_outbound_shipment_b() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_b");
        r.name_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.invoice_number = 2;
        r.r#type = InvoiceRowType::OutboundShipment;
        r.status = InvoiceRowStatus::Shipped;
        r.comment = Some("Sort comment test Ab".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0);
        r.picked_datetime = Some(Utc::now().naive_utc());
        r.shipped_datetime = Some(Utc::now().naive_utc());
        r.allocated_datetime = Some(NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0));
    })
}

pub fn mock_outbound_shipment_c() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_c");
        r.name_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.invoice_number = 3;
        r.r#type = InvoiceRowType::OutboundShipment;
        r.status = InvoiceRowStatus::New;
        r.comment = Some("Sort comment test aB".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0);
    })
}

pub fn mock_outbound_shipment_d() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_d");
        r.name_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.invoice_number = 9;
        r.r#type = InvoiceRowType::OutboundShipment;
        r.status = InvoiceRowStatus::Picked;
        r.comment = Some("Sort comment test ba".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0);
        r.picked_datetime = Some(NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0));
        r.allocated_datetime = Some(NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0));
    })
}

// Added for CI update
pub fn mock_outbound_shipment_picked() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_picked");
        r.name_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.invoice_number = 3;
        r.r#type = InvoiceRowType::OutboundShipment;
        r.status = InvoiceRowStatus::Picked;
        r.comment = Some("Sort comment test Ba".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd(1970, 1, 7).and_hms_milli(15, 30, 0, 0);
        r.picked_datetime = Some(Utc::now().naive_utc());
        r.allocated_datetime = Some(NaiveDate::from_ymd(1970, 1, 7).and_hms_milli(15, 30, 0, 0));
    })
}

pub fn mock_outbound_shipment_shipped() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_shipped");
        r.name_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.invoice_number = 3;
        r.r#type = InvoiceRowType::OutboundShipment;
        r.status = InvoiceRowStatus::Shipped;
        r.comment = Some("Sort comment test bA".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd(1970, 1, 5).and_hms_milli(15, 30, 0, 0);
        r.picked_datetime = Some(Utc::now().naive_utc());
        r.shipped_datetime = Some(Utc::now().naive_utc());
        r.allocated_datetime = Some(NaiveDate::from_ymd(1970, 1, 5).and_hms_milli(15, 30, 0, 0));
    })
}

// Added for CI delete test
pub fn mock_outbound_shipment_no_lines() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_no_lines");
        r.name_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.invoice_number = 3;
        r.r#type = InvoiceRowType::OutboundShipment;
        r.status = InvoiceRowStatus::Picked;
        r.comment = Some("Sort comment test ac".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd(1970, 1, 6).and_hms_milli(15, 30, 0, 0);
        r.picked_datetime = Some(Utc::now().naive_utc());
        r.allocated_datetime = Some(NaiveDate::from_ymd(1970, 1, 6).and_hms_milli(15, 30, 0, 0));
    })
}

pub fn mock_inbound_shipment_a() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("inbound_shipment_a");
        r.name_id = String::from("name_store_b");
        r.store_id = String::from("store_a");
        r.invoice_number = 4;
        r.r#type = InvoiceRowType::InboundShipment;
        r.status = InvoiceRowStatus::Delivered;
        r.comment = Some("Sort comment test Ac".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd(1970, 1, 3).and_hms_milli(20, 30, 0, 0);
        r.delivered_datetime = Some(Utc::now().naive_utc());
    })
}

pub fn mock_inbound_shipment_b() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("inbound_shipment_b");
        r.name_id = String::from("name_store_c");
        r.store_id = String::from("store_a");
        r.invoice_number = 5;
        r.r#type = InvoiceRowType::InboundShipment;
        r.status = InvoiceRowStatus::Verified;
        r.comment = Some("Sort comment test aC".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0);
        r.allocated_datetime = Some(NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0));
        r.delivered_datetime = Some(Utc::now().naive_utc());
        r.verified_datetime = Some(Utc::now().naive_utc());
    })
}

pub fn mock_inbound_shipment_c() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("inbound_shipment_c");
        r.name_id = String::from("name_store_c");
        r.store_id = String::from("store_a");
        r.invoice_number = 6;
        r.r#type = InvoiceRowType::InboundShipment;
        r.status = InvoiceRowStatus::New;
        r.comment = Some("Sort comment test ca".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0);
    })
}

pub fn mock_inbound_shipment_d() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("inbound_shipment_d");
        r.name_id = String::from("name_store_c");
        r.store_id = String::from("store_a");
        r.invoice_number = 7;
        r.r#type = InvoiceRowType::InboundShipment;
        r.status = InvoiceRowStatus::Delivered;
        r.comment = Some("Sort comment test Ca".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0);
        r.delivered_datetime = Some(NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0));
    })
}

pub fn mock_empty_draft_inbound_shipment() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("empty_draft_inbound_shipment");
        r.name_id = String::from("name_store_c");
        r.store_id = String::from("store_a");
        r.invoice_number = 8;
        r.r#type = InvoiceRowType::InboundShipment;
        r.status = InvoiceRowStatus::New;
        r.comment = Some("Sort comment test AC".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0);
    })
}

pub fn mock_unique_number_inbound_shipment() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("mock_unique_number_inbound_shipment");
        r.name_id = String::from("name_store_c");
        r.store_id = String::from("store_a");
        r.name_store_id = Some(String::from("store_a"));
        r.invoice_number = 9999999;
        r.r#type = InvoiceRowType::InboundShipment;
        r.status = InvoiceRowStatus::New;
        r.created_datetime = NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0);
    })
}

pub fn mock_outbound_shipments() -> Vec<InvoiceRow> {
    vec![
        mock_outbound_shipment_a(),
        mock_outbound_shipment_b(),
        mock_outbound_shipment_c(),
        mock_outbound_shipment_d(),
        mock_outbound_shipment_shipped(),
        mock_outbound_shipment_picked(),
        mock_outbound_shipment_no_lines(),
    ]
}

pub fn mock_inbound_shipments() -> Vec<InvoiceRow> {
    vec![
        mock_inbound_shipment_a(),
        mock_inbound_shipment_b(),
        mock_inbound_shipment_c(),
        mock_inbound_shipment_d(),
        mock_empty_draft_inbound_shipment(),
        mock_unique_number_inbound_shipment(),
    ]
}

pub fn mock_invoices() -> Vec<InvoiceRow> {
    let mut mock_invoices: Vec<InvoiceRow> = Vec::new();

    mock_invoices.extend(mock_outbound_shipments());
    mock_invoices.extend(mock_inbound_shipments());

    mock_invoices
}
