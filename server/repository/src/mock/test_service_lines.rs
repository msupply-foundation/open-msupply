use util::inline_init;

use crate::{InvoiceLineRow, InvoiceRow, InvoiceRowStatus, InvoiceRowType};

use super::{currency_a, mock_default_service_item, mock_name_a, MockData};

pub fn mock_test_service_item() -> MockData {
    let mut result = MockData::default();
    result.invoices = vec![
        mock_draft_outbound_with_service_lines(),
        mock_draft_inbound_shipment_with_service_lines(),
        mock_draft_outbound_shipped_with_service_lines(),
        mock_draft_inbound_verified_with_service_lines(),
        mock_draft_inbound_shipment_no_lines(),
    ];
    result.invoice_lines = vec![
        mock_draft_outbound_service_line(),
        mock_draft_inbound_service_line(),
        mock_draft_outbound_shipped_service_line(),
        mock_draft_inbound_verified_service_line(),
    ];
    result
}
// Outbound

pub fn mock_draft_outbound_with_service_lines() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "mock_draft_outbound_with_service_lines".to_string();
        r.name_link_id = mock_name_a().id;
        r.store_id = "store_a".to_owned();
        r.r#type = InvoiceRowType::OutboundShipment;
        r.status = InvoiceRowStatus::New;
        r.currency_id = currency_a().id;
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
        r.store_id = "store_a".to_owned();
        r.r#type = InvoiceRowType::OutboundShipment;
        r.status = InvoiceRowStatus::Shipped;
        r.currency_id = currency_a().id;
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
        r.store_id = "store_a".to_owned();
        r.r#type = InvoiceRowType::InboundShipment;
        r.status = InvoiceRowStatus::New;
        r.currency_id = currency_a().id;
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
        r.store_id = "store_a".to_owned();
        r.r#type = InvoiceRowType::InboundShipment;
        r.status = InvoiceRowStatus::New;
        r.currency_id = currency_a().id;
    })
}

pub fn mock_draft_inbound_verified_with_service_lines() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "mock_draft_inbound_shipped_with_service_lines".to_string();
        r.name_link_id = mock_name_a().id;
        r.store_id = "store_a".to_owned();
        r.r#type = InvoiceRowType::InboundShipment;
        r.status = InvoiceRowStatus::Verified;
        r.currency_id = currency_a().id;
    })
}

pub fn mock_draft_inbound_verified_service_line() -> InvoiceLineRow {
    inline_init(|r: &mut InvoiceLineRow| {
        r.id = "mock_draft_inbound_shipped_service_line".to_string();
        r.invoice_id = mock_draft_inbound_verified_with_service_lines().id;
        r.item_link_id = mock_default_service_item().id;
    })
}
