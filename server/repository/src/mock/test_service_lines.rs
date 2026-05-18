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
    InvoiceRow {
        id: "mock_draft_outbound_with_service_lines".to_string(),
        name_id: mock_name_a().id,
        store_id: "store_a".to_string(),
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::New,
        ..Default::default()
    }
}

pub fn mock_draft_outbound_service_line() -> InvoiceLineRow {
    InvoiceLineRow {
        id: "mock_draft_outbound_service_line".to_string(),
        invoice_id: mock_draft_outbound_with_service_lines().id,
        item_link_id: mock_default_service_item().id,
        ..Default::default()
    }
}

pub fn mock_draft_outbound_shipped_with_service_lines() -> InvoiceRow {
    InvoiceRow {
        id: "mock_draft_outbound_shipped_with_service_lines".to_string(),
        name_id: mock_name_a().id,
        store_id: "store_a".to_string(),
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::Shipped,
        ..Default::default()
    }
}

pub fn mock_draft_outbound_shipped_service_line() -> InvoiceLineRow {
    InvoiceLineRow {
        id: "mock_draft_outbound_shipped_service_line".to_string(),
        invoice_id: mock_draft_outbound_shipped_with_service_lines().id,
        item_link_id: mock_default_service_item().id,
        ..Default::default()
    }
}

// Inbound

pub fn mock_draft_inbound_shipment_with_service_lines() -> InvoiceRow {
    InvoiceRow {
        id: "mock_draft_inbound_shipment_with_service_lines".to_string(),
        name_id: mock_name_a().id,
        store_id: "store_a".to_string(),
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::New,
        ..Default::default()
    }
}

pub fn mock_draft_inbound_service_line() -> InvoiceLineRow {
    InvoiceLineRow {
        id: "mock_draft_inbound_service_line".to_string(),
        invoice_id: mock_draft_inbound_shipment_with_service_lines().id,
        item_link_id: mock_default_service_item().id,
        ..Default::default()
    }
}

pub fn mock_draft_inbound_shipment_no_lines() -> InvoiceRow {
    InvoiceRow {
        id: "mock_draft_inbound_shipment_no_lines".to_string(),
        name_id: mock_name_a().id,
        store_id: "store_a".to_string(),
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::New,
        ..Default::default()
    }
}

pub fn mock_draft_inbound_verified_with_service_lines() -> InvoiceRow {
    InvoiceRow {
        id: "mock_draft_inbound_shipped_with_service_lines".to_string(),
        name_id: mock_name_a().id,
        store_id: "store_a".to_string(),
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::Verified,
        ..Default::default()
    }
}

pub fn mock_draft_inbound_verified_service_line() -> InvoiceLineRow {
    InvoiceLineRow {
        id: "mock_draft_inbound_shipped_service_line".to_string(),
        invoice_id: mock_draft_inbound_verified_with_service_lines().id,
        item_link_id: mock_default_service_item().id,
        ..Default::default()
    }
}
