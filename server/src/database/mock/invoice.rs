use chrono::{NaiveDate, Utc};

use crate::database::schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType};

pub fn mock_outbound_shipment_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_a"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_b"),
        invoice_number: 1,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Confirmed,
        on_hold: false,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
        confirm_datetime: Some(Utc::now().naive_utc()),
        finalised_datetime: None,
    }
}

pub fn mock_outbound_shipment_b() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_b"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 2,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Finalised,
        on_hold: false,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0),
        confirm_datetime: Some(Utc::now().naive_utc()),
        finalised_datetime: Some(Utc::now().naive_utc()),
    }
}

pub fn mock_outbound_shipment_c() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_c"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Draft,
        on_hold: false,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0),
        confirm_datetime: None,
        finalised_datetime: None,
    }
}

pub fn mock_outbound_shipment_d() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_d"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 9,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Confirmed,
        on_hold: false,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0),
        confirm_datetime: Some(NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0)),
        finalised_datetime: None,
    }
}

// Added for CI update
pub fn mock_outbound_shipment_confirmed() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_confirmed"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Confirmed,
        on_hold: false,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: NaiveDate::from_ymd(1970, 1, 7).and_hms_milli(15, 30, 0, 0),
        confirm_datetime: Some(Utc::now().naive_utc()),
        finalised_datetime: Some(Utc::now().naive_utc()),
    }
}

pub fn mock_outbound_shipment_finalised() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_finalised"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Finalised,
        on_hold: false,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: NaiveDate::from_ymd(1970, 1, 5).and_hms_milli(15, 30, 0, 0),
        confirm_datetime: Some(Utc::now().naive_utc()),
        finalised_datetime: Some(Utc::now().naive_utc()),
    }
}

// Added for CI delete test
pub fn mock_outbound_shipment_no_lines() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_no_lines"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Confirmed,
        on_hold: false,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: NaiveDate::from_ymd(1970, 1, 6).and_hms_milli(15, 30, 0, 0),
        confirm_datetime: Some(Utc::now().naive_utc()),
        finalised_datetime: Some(Utc::now().naive_utc()),
    }
}

pub fn mock_inbound_shipment_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_a"),
        name_id: String::from("name_store_b"),
        store_id: String::from("store_a"),
        invoice_number: 4,
        r#type: InvoiceRowType::InboundShipment,
        status: InvoiceRowStatus::Confirmed,
        on_hold: false,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: NaiveDate::from_ymd(1970, 1, 3).and_hms_milli(20, 30, 0, 0),
        confirm_datetime: Some(Utc::now().naive_utc()),
        finalised_datetime: None,
    }
}

pub fn mock_inbound_shipment_b() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_b"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 5,
        r#type: InvoiceRowType::InboundShipment,
        status: InvoiceRowStatus::Finalised,
        on_hold: false,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0),
        confirm_datetime: Some(Utc::now().naive_utc()),
        finalised_datetime: Some(Utc::now().naive_utc()),
    }
}

pub fn mock_inbound_shipment_c() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_c"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 6,
        r#type: InvoiceRowType::InboundShipment,
        status: InvoiceRowStatus::Draft,
        on_hold: false,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0),
        confirm_datetime: None,
        finalised_datetime: None,
    }
}

pub fn mock_inbound_shipment_d() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_d"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 7,
        r#type: InvoiceRowType::InboundShipment,
        status: InvoiceRowStatus::Confirmed,
        on_hold: false,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0),
        confirm_datetime: Some(NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0)),
        finalised_datetime: None,
    }
}

// Added for CI update test
// invoice containing invoice lines without stock line
pub fn mock_outbound_shipment_invalid_stock_line() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_invalid_stock_line"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Draft,
        on_hold: false,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: NaiveDate::from_ymd(1970, 1, 6).and_hms_milli(15, 30, 0, 0),
        confirm_datetime: Some(Utc::now().naive_utc()),
        finalised_datetime: Some(Utc::now().naive_utc()),
    }
}

pub fn mock_empty_draft_inbound_shipment() -> InvoiceRow {
    InvoiceRow {
        id: String::from("empty_draft_inbound_shipment"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 8,
        r#type: InvoiceRowType::InboundShipment,
        status: InvoiceRowStatus::Draft,
        on_hold: false,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0),
        confirm_datetime: None,
        finalised_datetime: None,
    }
}

pub fn mock_outbound_shipments() -> Vec<InvoiceRow> {
    vec![
        mock_outbound_shipment_a(),
        mock_outbound_shipment_b(),
        mock_outbound_shipment_c(),
        mock_outbound_shipment_d(),
        mock_outbound_shipment_finalised(),
        mock_outbound_shipment_invalid_stock_line(),
        mock_outbound_shipment_confirmed(),
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
    ]
}

pub fn mock_invoices() -> Vec<InvoiceRow> {
    let mut mock_invoices: Vec<InvoiceRow> = Vec::new();

    mock_invoices.extend(mock_outbound_shipments());
    mock_invoices.extend(mock_inbound_shipments());

    mock_invoices
}
