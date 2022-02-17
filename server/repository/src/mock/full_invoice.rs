use std::collections::HashMap;

use chrono::NaiveDate;

use crate::schema::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType, StockLineRow,
};

use super::common::{FullMockInvoice, FullMockInvoiceLine};

pub fn mock_full_draft_outbound_shipment_a() -> FullMockInvoice {
    let invoice_id = "draft_ci_a".to_string();
    let invoice_line_a_id = "draft_ci_a_line_a".to_string();
    let invoice_line_b_id = "draft_ci_a_line_b".to_string();
    let stock_line_a_id = "draft_ci_a_stock_line_a".to_string();
    let stock_line_b_id = "draft_ci_a_stock_line_b".to_string();

    FullMockInvoice {
        invoice: InvoiceRow {
            id: invoice_id.clone(),
            name_id: String::from("name_store_b"),
            store_id: String::from("store_a"),
            invoice_number: 10,
            name_store_id: None,
            r#type: InvoiceRowType::OutboundShipment,
            status: InvoiceRowStatus::New,
            on_hold: false,
            comment: None,
            their_reference: None,
            created_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
            allocated_datetime: None,
            shipped_datetime: None,
            colour: None,
            requisition_id: None,
            linked_invoice_id: None,
            picked_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
        },
        lines: vec![
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: invoice_line_a_id,
                    stock_line_id: Some(stock_line_a_id.clone()),
                    invoice_id: invoice_id.clone(),
                    location_id: None,
                    item_id: String::from("item_a"),
                    item_name: String::from("Item A"),
                    item_code: String::from("item_a_code"),
                    batch: None,
                    expiry_date: None,
                    pack_size: 4,
                    cost_price_per_pack: 43.0,
                    sell_price_per_pack: 32.0,
                    total_before_tax: 278.26,
                    total_after_tax: 320.0,
                    tax: Some(15.0),
                    r#type: InvoiceLineRowType::StockOut,
                    number_of_packs: 10,
                    note: None,
                },
                stock_line: StockLineRow {
                    id: stock_line_a_id,
                    item_id: String::from("item_a"),
                    store_id: String::from("store_a"),
                    location_id: None,
                    batch: None,
                    available_number_of_packs: 20,
                    pack_size: 4,
                    cost_price_per_pack: 43.0,
                    sell_price_per_pack: 32.0,
                    total_number_of_packs: 30,
                    expiry_date: None,
                    on_hold: false,
                    note: None,
                },
            },
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: invoice_line_b_id,
                    stock_line_id: Some(stock_line_b_id.clone()),
                    invoice_id: invoice_id.clone(),
                    location_id: None,
                    item_id: String::from("item_a"),
                    item_name: String::from("Item A"),
                    item_code: String::from("item_a_code"),
                    batch: None,
                    expiry_date: None,
                    pack_size: 2,
                    cost_price_per_pack: 41.0,
                    sell_price_per_pack: 21.0,
                    total_before_tax: 210.0,
                    total_after_tax: 210.0,
                    tax: None,
                    r#type: InvoiceLineRowType::StockOut,
                    number_of_packs: 2,
                    note: None,
                },
                stock_line: StockLineRow {
                    id: stock_line_b_id,
                    item_id: String::from("item_a"),
                    store_id: String::from("store_a"),
                    location_id: None,
                    batch: None,
                    available_number_of_packs: 10,
                    pack_size: 2,
                    cost_price_per_pack: 41.0,
                    sell_price_per_pack: 21.0,
                    total_number_of_packs: 12,
                    expiry_date: None,
                    on_hold: false,
                    note: None,
                },
            },
        ],
    }
}

pub fn mock_full_draft_inbound_shipment_on_hold() -> FullMockInvoice {
    let invoice_id = "on_hold_is_a".to_string();

    FullMockInvoice {
        invoice: InvoiceRow {
            id: invoice_id.clone(),
            name_id: String::from("name_store_a"),
            store_id: String::from("store_b"),
            invoice_number: 11,
            name_store_id: None,
            r#type: InvoiceRowType::InboundShipment,
            status: InvoiceRowStatus::New,
            on_hold: true,
            comment: None,
            their_reference: None,
            created_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
            allocated_datetime: None,
            colour: None,
            requisition_id: None,
            linked_invoice_id: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
        },
        lines: Vec::new(),
    }
}

pub fn mock_full_draft_outbound_shipment_on_hold() -> FullMockInvoice {
    let invoice_id = "on_hold_os_a".to_string();

    FullMockInvoice {
        invoice: InvoiceRow {
            id: invoice_id.clone(),
            name_id: String::from("name_store_a"),
            store_id: String::from("store_b"),
            invoice_number: 11,
            name_store_id: None,
            r#type: InvoiceRowType::OutboundShipment,
            status: InvoiceRowStatus::New,
            on_hold: true,
            comment: None,
            their_reference: None,
            created_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
            allocated_datetime: None,
            colour: None,
            requisition_id: None,
            linked_invoice_id: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
        },
        lines: Vec::new(),
    }
}

pub fn mock_full_invoices() -> HashMap<String, FullMockInvoice> {
    vec![
        (
            "draft_ci_a".to_string(),
            mock_full_draft_outbound_shipment_a(),
        ),
        (
            "inbound_shipment_on_hold".to_string(),
            mock_full_draft_inbound_shipment_on_hold(),
        ),
        (
            "outbound_shipment_on_hold".to_string(),
            mock_full_draft_outbound_shipment_on_hold(),
        ),
    ]
    .into_iter()
    .collect()
}
