use util::inline_init;

use crate::{InvoiceLineRow, InvoiceRow, InvoiceStatus, InvoiceType};

use super::{mock_default_service_item, mock_name_a, MockData};

pub fn mock_test_service_item() -> MockData {
    MockData {
        invoices: vec![
            mock_draft_outbound_with_service_lines(),
            mock_draft_inbound_shipment_with_service_lines(),
            mock_draft_outbound_shipped_with_service_lines(),
            mock_draft_inbound_verified_with_service_lines(),
            mock_draft_inbound_shipment_no_lines(),
        ],
        invoice_lines: vec![
            mock_draft_outbound_service_line(),
            mock_draft_inbound_service_line(),
            mock_draft_outbound_shipped_service_line(),
            mock_draft_inbound_verified_service_line(),
        ],
        ..Default::default()
    }
}
// Outbound

pub fn mock_draft_outbound_with_service_lines() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "mock_draft_outbound_with_service_lines".to_string();
        r.name_link_id = mock_name_a().id;
        r.store_id = "store_a".to_string();
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::New;
    })
}

pub fn mock_draft_outbound_service_line() -> InvoiceLineRow {
    inline_init(|r: &mut InvoiceLineRow| {
        r.id = "mock_draft_outbound_service_line".to_string();
        r.invoice_id = mock_draft_outbound_with_service_lines().id;
        r.item_link_id = mock_default_service_item().id;
    })
}

pub fn mock_draft_outbound_shipped_with_service_lines() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "mock_draft_outbound_shipped_with_service_lines".to_string();
        r.name_link_id = mock_name_a().id;
        r.store_id = "store_a".to_string();
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::Shipped;
    })
}

pub fn mock_draft_outbound_shipped_service_line() -> InvoiceLineRow {
    inline_init(|r: &mut InvoiceLineRow| {
        r.id = "mock_draft_outbound_shipped_service_line".to_string();
        r.invoice_id = mock_draft_outbound_shipped_with_service_lines().id;
        r.item_link_id = mock_default_service_item().id;
    })
}

// Inbound

pub fn mock_draft_inbound_shipment_with_service_lines() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "mock_draft_inbound_shipment_with_service_lines".to_string();
        r.name_link_id = mock_name_a().id;
        r.store_id = "store_a".to_string();
        r.r#type = InvoiceType::InboundShipment;
        r.status = InvoiceStatus::New;
    })
}

pub fn mock_draft_inbound_service_line() -> InvoiceLineRow {
    inline_init(|r: &mut InvoiceLineRow| {
        r.id = "mock_draft_inbound_service_line".to_string();
        r.invoice_id = mock_draft_inbound_shipment_with_service_lines().id;
        r.item_link_id = mock_default_service_item().id;
    })
}

pub fn mock_draft_inbound_shipment_no_lines() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "mock_draft_inbound_shipment_no_lines".to_string();
        r.name_link_id = mock_name_a().id;
        r.store_id = "store_a".to_string();
        r.r#type = InvoiceType::InboundShipment;
        r.status = InvoiceStatus::New;
    })
}

pub fn mock_draft_inbound_verified_with_service_lines() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "mock_draft_inbound_shipped_with_service_lines".to_string();
        r.name_link_id = mock_name_a().id;
        r.store_id = "store_a".to_string();
        r.r#type = InvoiceType::InboundShipment;
        r.status = InvoiceStatus::Verified;
    })
}

pub fn mock_draft_inbound_verified_service_line() -> InvoiceLineRow {
    inline_init(|r: &mut InvoiceLineRow| {
        r.id = "mock_draft_inbound_shipped_service_line".to_string();
        r.invoice_id = mock_draft_inbound_verified_with_service_lines().id;
        r.item_link_id = mock_default_service_item().id;
    })
}
