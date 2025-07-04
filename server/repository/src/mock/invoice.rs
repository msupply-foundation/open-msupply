use chrono::{NaiveDate, Utc};
use util::inline_init;

use crate::{InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType};

pub fn mock_outbound_shipment_a() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_a");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_b");
        r.invoice_number = 1;
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::Picked;
        r.comment = Some("Sort comment test ab".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap();
        r.picked_datetime = Some(Utc::now().naive_utc());
    })
}

pub fn mock_outbound_shipment_b() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_b");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.invoice_number = 2;
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::Shipped;
        r.comment = Some("Sort comment test Ab".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 2)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap();
        r.picked_datetime = Some(Utc::now().naive_utc());
        r.shipped_datetime = Some(Utc::now().naive_utc());
        r.allocated_datetime = Some(
            NaiveDate::from_ymd_opt(1970, 1, 2)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        );
    })
}

pub fn mock_outbound_shipment_c() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_c");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.invoice_number = 3;
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::New;
        r.comment = Some("Sort comment test aB".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 2)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_outbound_shipment_d() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_d");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.invoice_number = 9;
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::Picked;
        r.comment = Some("Sort comment test ba".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 2)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap();
        r.picked_datetime = Some(
            NaiveDate::from_ymd_opt(1970, 1, 2)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        );
        r.allocated_datetime = Some(
            NaiveDate::from_ymd_opt(1970, 1, 2)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        );
    })
}

pub fn mock_outbound_shipment_e() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_e");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_a");
        r.invoice_number = 3;
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::New;
        r.comment = Some("Sort comment test aB".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 2)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap();
    })
}

// Added for CI update
pub fn mock_outbound_shipment_picked() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_picked");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.invoice_number = 3;
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::Picked;
        r.comment = Some("Sort comment test Ba".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 7)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap();
        r.picked_datetime = Some(Utc::now().naive_utc());
        r.allocated_datetime = Some(
            NaiveDate::from_ymd_opt(1970, 1, 7)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        );
    })
}

pub fn mock_outbound_shipment_shipped() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_shipped");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.invoice_number = 3;
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::Shipped;
        r.comment = Some("Sort comment test bA".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 5)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap();
        r.picked_datetime = Some(Utc::now().naive_utc());
        r.shipped_datetime = Some(Utc::now().naive_utc());
        r.allocated_datetime = Some(
            NaiveDate::from_ymd_opt(1970, 1, 5)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        );
    })
}

// Added for CI delete test
pub fn mock_outbound_shipment_no_lines() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_no_lines");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.invoice_number = 3;
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::Picked;
        r.comment = Some("Sort comment test ac".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 6)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap();
        r.picked_datetime = Some(Utc::now().naive_utc());
        r.allocated_datetime = Some(
            NaiveDate::from_ymd_opt(1970, 1, 6)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        );
    })
}

pub fn mock_new_outbound_shipment_no_lines() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("new_outbound_shipment_no_lines");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::New;
    })
}

pub fn mock_new_outbound_shipment_no_stockline() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("mock_new_outbound_shipment_no_stockline");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_c");
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::New;
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 6)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_outbound_shipment_on_hold() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("outbound_shipment_on_hold");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_a");
        r.invoice_number = 10;
        r.on_hold = true;
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::Allocated;
        r.comment = Some("Sort comment test Ba".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 7)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap();
        r.allocated_datetime = Some(
            NaiveDate::from_ymd_opt(1970, 1, 7)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        );
    })
}

pub fn mock_inbound_shipment_a() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("inbound_shipment_a");
        r.name_link_id = String::from("name_store_b");
        r.store_id = String::from("store_a");
        r.invoice_number = 4;
        r.r#type = InvoiceType::InboundShipment;
        r.status = InvoiceStatus::Received;
        r.comment = Some("Sort comment test Ac".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 3)
            .unwrap()
            .and_hms_milli_opt(20, 30, 0, 0)
            .unwrap();
        r.received_datetime = NaiveDate::from_ymd_opt(1970, 1, 3)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0);
    })
}

pub fn mock_inbound_shipment_b() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("inbound_shipment_b");
        r.name_link_id = String::from("name_store_c");
        r.store_id = String::from("store_a");
        r.invoice_number = 5;
        r.r#type = InvoiceType::InboundShipment;
        r.status = InvoiceStatus::Verified;
        r.comment = Some("Sort comment test aC".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 4)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap();
        r.allocated_datetime = Some(
            NaiveDate::from_ymd_opt(1970, 1, 4)
                .unwrap()
                .and_hms_milli_opt(21, 30, 0, 0)
                .unwrap(),
        );
        r.received_datetime = Some(Utc::now().naive_utc());
        r.verified_datetime = Some(Utc::now().naive_utc());
    })
}

pub fn mock_inbound_shipment_c() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("inbound_shipment_c");
        r.name_link_id = String::from("name_store_c");
        r.store_id = String::from("store_a");
        r.invoice_number = 6;
        r.r#type = InvoiceType::InboundShipment;
        r.status = InvoiceStatus::New;
        r.comment = Some("Sort comment test ca".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 4)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap();
        r.default_donor_link_id = Some("donor_a".to_owned());
    })
}

pub fn mock_inbound_shipment_d() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("inbound_shipment_d");
        r.name_link_id = String::from("name_store_c");
        r.store_id = String::from("store_a");
        r.invoice_number = 7;
        r.r#type = InvoiceType::InboundShipment;
        r.status = InvoiceStatus::Received;
        r.comment = Some("Sort comment test Ca".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 4)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap();
        r.received_datetime = Some(
            NaiveDate::from_ymd_opt(1970, 1, 4)
                .unwrap()
                .and_hms_milli_opt(21, 30, 0, 0)
                .unwrap(),
        );
    })
}

pub fn mock_inbound_shipment_e() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("inbound_shipment_e");
        r.name_link_id = String::from("name_store_c");
        r.store_id = String::from("store_a");
        r.invoice_number = 7;
        r.r#type = InvoiceType::InboundShipment;
        r.status = InvoiceStatus::New;
        r.on_hold = true;
        r.comment = Some("Sort comment test".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 4)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_inbound_shipment_f() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("inbound_shipment_f");
        r.name_link_id = String::from("name_store_c");
        r.store_id = String::from("store_a");
        r.invoice_number = 8;
        r.r#type = InvoiceType::InboundShipment;
        r.status = InvoiceStatus::Received;
        r.on_hold = true;
        r.comment = Some("Sort comment test".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 4)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_empty_draft_inbound_shipment() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("empty_draft_inbound_shipment");
        r.name_link_id = String::from("name_store_c");
        r.store_id = String::from("store_a");
        r.invoice_number = 8;
        r.r#type = InvoiceType::InboundShipment;
        r.status = InvoiceStatus::New;
        r.comment = Some("Sort comment test AC".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 4)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_unique_number_inbound_shipment() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("mock_unique_number_inbound_shipment");
        r.name_link_id = String::from("name_store_c");
        r.store_id = String::from("store_a");
        r.name_store_id = Some(String::from("store_a"));
        r.invoice_number = 9999999;
        r.r#type = InvoiceType::InboundShipment;
        r.status = InvoiceStatus::New;
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 4)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_transferred_inbound_shipment_a() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("transferred_inbound_shipment_a");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_b");
        r.invoice_number = 9;
        r.r#type = InvoiceType::InboundShipment;
        r.status = InvoiceStatus::Received;
        r.comment = Some("Sort comment test Ac".to_owned());
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 3)
            .unwrap()
            .and_hms_milli_opt(20, 30, 0, 0)
            .unwrap();
        r.received_datetime = NaiveDate::from_ymd_opt(1970, 1, 3)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0);
        r.linked_invoice_id = Some(String::from("store_a"));
    })
}

pub fn mock_outbound_shipment_line_a() -> InvoiceLineRow {
    inline_init(|r: &mut InvoiceLineRow| {
        r.id = String::from("outbound_shipment_line_a");
        r.invoice_id = String::from("outbound_shipment_c");
        r.item_link_id = String::from("item_a");
        r.item_name = String::from("Item A");
        r.item_code = String::from("a");
        r.pack_size = 1.0;
        r.cost_price_per_pack = 0.0;
        r.sell_price_per_pack = 0.0;
        r.total_before_tax = 0.0;
        r.total_after_tax = 0.0;
        r.r#type = InvoiceLineType::StockOut;
        r.number_of_packs = 0.0;
    })
}

pub fn mock_prescription_a() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("prescription_a");
        r.name_link_id = String::from("testId");
        r.store_id = String::from("store_a");
        r.invoice_number = 1;
        r.r#type = InvoiceType::Prescription;
        r.status = InvoiceStatus::New;
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_prescription_picked() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("prescription_picked");
        r.name_link_id = String::from("testId");
        r.store_id = String::from("store_a");
        r.invoice_number = 1;
        r.r#type = InvoiceType::Prescription;
        r.status = InvoiceStatus::Picked;
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_prescription_verified() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("prescription_verified");
        r.name_link_id = String::from("testId");
        r.store_id = String::from("store_a");
        r.invoice_number = 1;
        r.r#type = InvoiceType::Prescription;
        r.status = InvoiceStatus::Verified;
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_prescription_cancelled() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("prescription_cancelled");
        r.name_link_id = String::from("testId");
        r.store_id = String::from("store_a");
        r.invoice_number = 1;
        r.r#type = InvoiceType::Prescription;
        r.status = InvoiceStatus::Cancelled;
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(21, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_supplier_return_a() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("supplier_return_a");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_a");
        r.invoice_number = 1;
        r.r#type = InvoiceType::SupplierReturn;
        r.status = InvoiceStatus::Picked;
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap();
        r.picked_datetime = Some(Utc::now().naive_utc());
    })
}

pub fn mock_supplier_return_b() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("supplier_return_b");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_b");
        r.invoice_number = 2;
        r.r#type = InvoiceType::SupplierReturn;
        r.status = InvoiceStatus::New;
        r.their_reference = Some(String::from(""));
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_customer_return_a() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("customer_return_a");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_b");
        r.invoice_number = 1;
        r.r#type = InvoiceType::CustomerReturn;
        r.status = InvoiceStatus::Received;
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap();
        r.received_datetime = Some(Utc::now().naive_utc());
    })
}

pub fn mock_customer_return_b() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = String::from("customer_return_b");
        r.name_link_id = String::from("name_store_a");
        r.store_id = String::from("store_b");
        r.invoice_number = 2;
        r.r#type = InvoiceType::CustomerReturn;
        r.status = InvoiceStatus::New;
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
            .unwrap()
            .and_hms_opt(12, 30, 0)
            .unwrap();
    })
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
