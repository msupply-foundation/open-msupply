use chrono::{NaiveDate, Utc};

use crate::{InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType};

pub fn mock_outbound_shipment_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_a"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_b"),
        invoice_number: 1,
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::Picked,
        comment: Some("Sort comment test ab".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap(),
        picked_datetime: Some(Utc::now().naive_utc()),
        ..Default::default()
    }
}

pub fn mock_outbound_shipment_b() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_b"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 2,
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::Shipped,
        comment: Some("Sort comment test Ab".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 2)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap(),
        picked_datetime: Some(Utc::now().naive_utc()),
        shipped_datetime: Some(Utc::now().naive_utc()),
        allocated_datetime: Some(
            NaiveDate::from_ymd_opt(1970, 1, 2)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        ),
        ..Default::default()
    }
}

pub fn mock_outbound_shipment_c() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_c"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::New,
        comment: Some("Sort comment test aB".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 2)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_outbound_shipment_d() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_d"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 9,
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::Picked,
        comment: Some("Sort comment test ba".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 2)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap(),
        picked_datetime: Some(
            NaiveDate::from_ymd_opt(1970, 1, 2)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        ),
        allocated_datetime: Some(
            NaiveDate::from_ymd_opt(1970, 1, 2)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        ),
        ..Default::default()
    }
}

pub fn mock_outbound_shipment_e() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_e"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_a"),
        invoice_number: 3,
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::New,
        comment: Some("Sort comment test aB".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 2)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

// Added for CI update
pub fn mock_outbound_shipment_picked() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_picked"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::Picked,
        comment: Some("Sort comment test Ba".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 7)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap(),
        picked_datetime: Some(Utc::now().naive_utc()),
        allocated_datetime: Some(
            NaiveDate::from_ymd_opt(1970, 1, 7)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        ),
        ..Default::default()
    }
}

pub fn mock_outbound_shipment_shipped() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_shipped"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::Shipped,
        comment: Some("Sort comment test bA".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 5)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap(),
        picked_datetime: Some(Utc::now().naive_utc()),
        shipped_datetime: Some(Utc::now().naive_utc()),
        allocated_datetime: Some(
            NaiveDate::from_ymd_opt(1970, 1, 5)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        ),
        ..Default::default()
    }
}

// Added for CI delete test
pub fn mock_outbound_shipment_no_lines() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_no_lines"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::Picked,
        comment: Some("Sort comment test ac".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 6)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap(),
        picked_datetime: Some(Utc::now().naive_utc()),
        allocated_datetime: Some(
            NaiveDate::from_ymd_opt(1970, 1, 6)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        ),
        ..Default::default()
    }
}

pub fn mock_new_outbound_shipment_no_lines() -> InvoiceRow {
    InvoiceRow {
        id: String::from("new_outbound_shipment_no_lines"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::New,
        ..Default::default()
    }
}

pub fn mock_new_outbound_shipment_no_stockline() -> InvoiceRow {
    InvoiceRow {
        id: String::from("mock_new_outbound_shipment_no_stockline"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::New,
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 6)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_outbound_shipment_on_hold() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_on_hold"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_a"),
        invoice_number: 10,
        on_hold: true,
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::Allocated,
        comment: Some("Sort comment test Ba".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 7)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap(),
        allocated_datetime: Some(
            NaiveDate::from_ymd_opt(1970, 1, 7)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        ),
        ..Default::default()
    }
}

pub fn mock_inbound_shipment_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_a"),
        name_id: String::from("name_store_b"),
        store_id: String::from("store_a"),
        invoice_number: 4,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::Received,
        comment: Some("Sort comment test Ac".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 3)
            .unwrap()
            .and_hms_milli_opt(20, 30, 0, 0)
            .unwrap(),
        received_datetime: NaiveDate::from_ymd_opt(1970, 1, 3)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0),
        ..Default::default()
    }
}

pub fn mock_inbound_shipment_b() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_b"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 5,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::Verified,
        comment: Some("Sort comment test aC".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 4)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap(),
        allocated_datetime: Some(
            NaiveDate::from_ymd_opt(1970, 1, 4)
                .unwrap()
                .and_hms_milli_opt(21, 30, 0, 0)
                .unwrap(),
        ),
        received_datetime: Some(Utc::now().naive_utc()),
        verified_datetime: Some(Utc::now().naive_utc()),
        ..Default::default()
    }
}

pub fn mock_inbound_shipment_c() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_c"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 6,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::New,
        comment: Some("Sort comment test ca".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 4)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap(),
        default_donor_id: Some("donor_a".to_string()),
        ..Default::default()
    }
}

pub fn mock_inbound_shipment_d() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_d"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 7,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::Received,
        comment: Some("Sort comment test Ca".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 5)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap(),
        received_datetime: NaiveDate::from_ymd_opt(1970, 1, 6)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0),
        ..Default::default()
    }
}

pub fn mock_inbound_shipment_e() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_e"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 7,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::New,
        on_hold: true,
        comment: Some("Sort comment test".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 4)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_inbound_shipment_f() -> InvoiceRow {
    InvoiceRow {
        id: String::from("inbound_shipment_f"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 8,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::Received,
        on_hold: true,
        comment: Some("Sort comment test".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 4)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_empty_draft_inbound_shipment() -> InvoiceRow {
    InvoiceRow {
        id: String::from("empty_draft_inbound_shipment"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 8,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::New,
        comment: Some("Sort comment test AC".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 4)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_unique_number_inbound_shipment() -> InvoiceRow {
    InvoiceRow {
        id: String::from("mock_unique_number_inbound_shipment"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        name_store_id: Some(String::from("store_a")),
        invoice_number: 9999999,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::New,
        comment: Some("Sort comment test AC".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 4)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_transferred_inbound_shipment_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("transferred_inbound_shipment_a"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_b"),
        invoice_number: 9,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::Received,
        comment: Some("Sort comment test Ac".to_string()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 3)
            .unwrap()
            .and_hms_milli_opt(20, 30, 0, 0)
            .unwrap(),
        received_datetime: NaiveDate::from_ymd_opt(1970, 1, 3)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0),
        linked_invoice_id: Some(String::from("store_a")),
        ..Default::default()
    }
}

pub fn mock_outbound_shipment_line_a() -> InvoiceLineRow {
    InvoiceLineRow {
        id: String::from("outbound_shipment_line_a"),
        invoice_id: String::from("outbound_shipment_c"),
        item_link_id: String::from("item_a"),
        item_name: String::from("Item A"),
        item_code: String::from("a"),
        pack_size: 1.0,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        r#type: InvoiceLineType::StockOut,
        number_of_packs: 0.0,
        ..Default::default()
    }
}

pub fn mock_prescription_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("prescription_a"),
        name_id: String::from("testId"),
        store_id: String::from("store_a"),
        invoice_number: 1,
        r#type: InvoiceType::Prescription,
        status: InvoiceStatus::New,
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_prescription_picked() -> InvoiceRow {
    InvoiceRow {
        id: String::from("prescription_picked"),
        name_id: String::from("testId"),
        store_id: String::from("store_a"),
        invoice_number: 1,
        r#type: InvoiceType::Prescription,
        status: InvoiceStatus::Picked,
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_prescription_verified() -> InvoiceRow {
    InvoiceRow {
        id: String::from("prescription_verified"),
        name_id: String::from("testId"),
        store_id: String::from("store_a"),
        invoice_number: 1,
        r#type: InvoiceType::Prescription,
        status: InvoiceStatus::Verified,
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_prescription_cancelled() -> InvoiceRow {
    InvoiceRow {
        id: String::from("prescription_cancelled"),
        name_id: String::from("testId"),
        store_id: String::from("store_a"),
        invoice_number: 1,
        r#type: InvoiceType::Prescription,
        status: InvoiceStatus::Cancelled,
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_supplier_return_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("supplier_return_a"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_a"),
        invoice_number: 1,
        r#type: InvoiceType::SupplierReturn,
        status: InvoiceStatus::Picked,
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap(),
        picked_datetime: Some(Utc::now().naive_utc()),
        ..Default::default()
    }
}

pub fn mock_supplier_return_b() -> InvoiceRow {
    InvoiceRow {
        id: String::from("supplier_return_b"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_b"),
        invoice_number: 2,
        r#type: InvoiceType::SupplierReturn,
        status: InvoiceStatus::New,
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_customer_return_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("customer_return_a"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_b"),
        invoice_number: 1,
        r#type: InvoiceType::CustomerReturn,
        status: InvoiceStatus::Received,
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap(),
        received_datetime: Some(Utc::now().naive_utc()),
        ..Default::default()
    }
}

pub fn mock_customer_return_b() -> InvoiceRow {
    InvoiceRow {
        id: String::from("customer_return_b"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_b"),
        invoice_number: 2,
        r#type: InvoiceType::CustomerReturn,
        status: InvoiceStatus::New,
        created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_opt(12, 30, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_outbound_shipments() -> Vec<InvoiceRow> {
    vec![
        mock_outbound_shipment_a(),
        mock_outbound_shipment_b(),
        mock_outbound_shipment_c(),
        mock_outbound_shipment_d(),
        mock_outbound_shipment_e(),
        mock_outbound_shipment_shipped(),
        mock_outbound_shipment_picked(),
        mock_outbound_shipment_no_lines(),
        mock_new_outbound_shipment_no_lines(),
        mock_new_outbound_shipment_no_stockline(),
        mock_outbound_shipment_on_hold(),
        mock_prescription_a(),
        mock_prescription_picked(),
        mock_prescription_verified(),
        mock_prescription_cancelled(),
    ]
}

pub fn mock_outbound_shipment_lines() -> Vec<InvoiceLineRow> {
    vec![mock_outbound_shipment_line_a()]
}

pub fn mock_inbound_shipments() -> Vec<InvoiceRow> {
    vec![
        mock_inbound_shipment_a(),
        mock_inbound_shipment_b(),
        mock_inbound_shipment_c(),
        mock_inbound_shipment_d(),
        mock_inbound_shipment_e(),
        mock_inbound_shipment_f(),
        mock_empty_draft_inbound_shipment(),
        mock_unique_number_inbound_shipment(),
        mock_transferred_inbound_shipment_a(),
    ]
}

pub fn mock_supplier_returns() -> Vec<InvoiceRow> {
    vec![mock_supplier_return_a(), mock_supplier_return_b()]
}

pub fn mock_customer_returns() -> Vec<InvoiceRow> {
    vec![mock_customer_return_a(), mock_customer_return_b()]
}

pub fn mock_invoices() -> Vec<InvoiceRow> {
    let mut mock_invoices: Vec<InvoiceRow> = Vec::new();

    mock_invoices.extend(mock_outbound_shipments());
    mock_invoices.extend(mock_inbound_shipments());
    mock_invoices.extend(mock_supplier_returns());
    mock_invoices.extend(mock_customer_returns());

    mock_invoices
}
