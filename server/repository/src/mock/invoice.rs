use chrono::{NaiveDate, Utc};

use crate::schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType};

pub fn mock_outbound_shipment_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_a"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_b"),
        invoice_number: 1,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Picked,
        on_hold: false,
        comment: Some("Sort comment test ab".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
        picked_datetime: Some(Utc::now().naive_utc()),
        color: None,
        allocated_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    }
}

pub fn mock_outbound_shipment_b() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_b"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 2,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Shipped,
        on_hold: false,
        comment: Some("Sort comment test Ab".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0),
        picked_datetime: Some(Utc::now().naive_utc()),
        shipped_datetime: Some(Utc::now().naive_utc()),
        color: None,
        allocated_datetime: Some(NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0)),
        delivered_datetime: None,
        verified_datetime: None,
    }
}

pub fn mock_outbound_shipment_c() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_c"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::New,
        on_hold: false,
        comment: Some("Sort comment test aB".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0),
        allocated_datetime: None,
        color: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    }
}

pub fn mock_outbound_shipment_d() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_d"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 9,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Picked,
        on_hold: false,
        comment: Some("Sort comment test ba".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0),
        picked_datetime: Some(NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0)),
        shipped_datetime: None,
        color: None,
        allocated_datetime: Some(NaiveDate::from_ymd(1970, 1, 2).and_hms_milli(15, 30, 0, 0)),
        delivered_datetime: None,
        verified_datetime: None,
    }
}

// Added for CI update
pub fn mock_outbound_shipment_picked() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_picked"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Picked,
        on_hold: false,
        comment: Some("Sort comment test Ba".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 7).and_hms_milli(15, 30, 0, 0),
        picked_datetime: Some(Utc::now().naive_utc()),
        color: None,
        allocated_datetime: Some(NaiveDate::from_ymd(1970, 1, 7).and_hms_milli(15, 30, 0, 0)),
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    }
}

pub fn mock_outbound_shipment_shipped() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_shipped"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::Shipped,
        on_hold: false,
        comment: Some("Sort comment test bA".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 5).and_hms_milli(15, 30, 0, 0),
        picked_datetime: Some(Utc::now().naive_utc()),
        shipped_datetime: Some(Utc::now().naive_utc()),
        color: None,
        allocated_datetime: Some(NaiveDate::from_ymd(1970, 1, 5).and_hms_milli(15, 30, 0, 0)),
        delivered_datetime: None,
        verified_datetime: None,
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
        status: InvoiceRowStatus::Picked,
        on_hold: false,
        comment: Some("Sort comment test ac".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 6).and_hms_milli(15, 30, 0, 0),
        picked_datetime: Some(Utc::now().naive_utc()),
        color: None,
        allocated_datetime: Some(NaiveDate::from_ymd(1970, 1, 6).and_hms_milli(15, 30, 0, 0)),
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    }
}

pub fn mock_inbound_shipment_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_a"),
        name_id: String::from("name_store_b"),
        store_id: String::from("store_a"),
        invoice_number: 4,
        r#type: InvoiceRowType::InboundShipment,
        status: InvoiceRowStatus::Delivered,
        on_hold: false,
        comment: Some("Sort comment test Ac".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 3).and_hms_milli(20, 30, 0, 0),
        delivered_datetime: Some(Utc::now().naive_utc()),
        color: None,
        allocated_datetime: None,
        shipped_datetime: None,
        picked_datetime: None,
        verified_datetime: None,
    }
}

pub fn mock_inbound_shipment_b() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_b"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 5,
        r#type: InvoiceRowType::InboundShipment,
        status: InvoiceRowStatus::Verified,
        on_hold: false,
        comment: Some("Sort comment test aC".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0),
        picked_datetime: None,
        shipped_datetime: None,
        color: None,
        allocated_datetime: Some(NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0)),
        delivered_datetime: Some(Utc::now().naive_utc()),
        verified_datetime: Some(Utc::now().naive_utc()),
    }
}

pub fn mock_inbound_shipment_c() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_c"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 6,
        r#type: InvoiceRowType::InboundShipment,
        status: InvoiceRowStatus::New,
        on_hold: false,
        comment: Some("Sort comment test ca".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0),
        allocated_datetime: None,
        picked_datetime: None,
        color: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    }
}

pub fn mock_inbound_shipment_d() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_d"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 7,
        r#type: InvoiceRowType::InboundShipment,
        status: InvoiceRowStatus::Delivered,
        on_hold: false,
        comment: Some("Sort comment test Ca".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0),
        delivered_datetime: Some(NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0)),
        color: None,
        allocated_datetime: None,
        shipped_datetime: None,
        picked_datetime: None,
        verified_datetime: None,
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
        status: InvoiceRowStatus::New,
        on_hold: false,
        comment: Some("Sort comment test cA".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 6).and_hms_milli(15, 30, 0, 0),
        color: None,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    }
}

pub fn mock_empty_draft_inbound_shipment() -> InvoiceRow {
    InvoiceRow {
        id: String::from("empty_draft_inbound_shipment"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 8,
        r#type: InvoiceRowType::InboundShipment,
        status: InvoiceRowStatus::New,
        on_hold: false,
        comment: Some("Sort comment test AC".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 4).and_hms_milli(21, 30, 0, 0),
        allocated_datetime: None,
        color: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    }
}

pub fn mock_outbound_shipments() -> Vec<InvoiceRow> {
    vec![
        mock_outbound_shipment_a(),
        mock_outbound_shipment_b(),
        mock_outbound_shipment_c(),
        mock_outbound_shipment_d(),
        mock_outbound_shipment_shipped(),
        mock_outbound_shipment_invalid_stock_line(),
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
    ]
}

pub fn mock_invoices() -> Vec<InvoiceRow> {
    let mut mock_invoices: Vec<InvoiceRow> = Vec::new();

    mock_invoices.extend(mock_outbound_shipments());
    mock_invoices.extend(mock_inbound_shipments());

    mock_invoices
}
