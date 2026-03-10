use std::collections::HashMap;

use chrono::NaiveDate;

use crate::{
    InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType, StockLineRow,
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
            store_id: String::from("store_c"),
            invoice_number: 10,
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap(),
            ..Default::default()
        },
        lines: vec![
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: invoice_line_a_id,
                    stock_line_id: Some(stock_line_a_id.clone()),
                    invoice_id: invoice_id.clone(),
                    item_link_id: String::from("item_a"),
                    item_name: String::from("Item A"),
                    item_code: String::from("item_a_code"),
                    pack_size: 4.0,
                    cost_price_per_pack: 43.0,
                    sell_price_per_pack: 32.0,
                    total_before_tax: 278.26,
                    total_after_tax: 320.0,
                    tax_percentage: Some(15.0),
                    r#type: InvoiceLineType::StockOut,
                    number_of_packs: 10.0,
                    ..Default::default()
                },
                stock_line: StockLineRow {
                    id: stock_line_a_id,
                    item_link_id: String::from("item_a"),
                    store_id: String::from("store_c"),
                    available_number_of_packs: 20.0,
                    pack_size: 4.0,
                    cost_price_per_pack: 43.0,
                    sell_price_per_pack: 32.0,
                    total_number_of_packs: 30.0,
                    ..Default::default()
                },
            },
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: invoice_line_b_id,
                    stock_line_id: Some(stock_line_b_id.clone()),
                    invoice_id: invoice_id.clone(),
                    item_link_id: String::from("item_a"),
                    item_name: String::from("Item A"),
                    item_code: String::from("item_a_code"),
                    pack_size: 2.0,
                    cost_price_per_pack: 41.0,
                    sell_price_per_pack: 21.0,
                    total_before_tax: 210.0,
                    total_after_tax: 210.0,
                    r#type: InvoiceLineType::StockOut,
                    number_of_packs: 2.0,
                    ..Default::default()
                },
                stock_line: StockLineRow {
                    id: stock_line_b_id,
                    item_link_id: String::from("item_a"),
                    store_id: String::from("store_c"),
                    available_number_of_packs: 10.0,
                    pack_size: 2.0,
                    cost_price_per_pack: 41.0,
                    sell_price_per_pack: 21.0,
                    total_number_of_packs: 12.0,
                    ..Default::default()
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
            store_id: String::from("store_a"),
            invoice_number: 11,
            r#type: InvoiceType::InboundShipment,
            status: InvoiceStatus::New,
            on_hold: true,
            created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap(),
            ..Default::default()
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
            store_id: String::from("store_c"),
            invoice_number: 11,
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::New,
            on_hold: true,
            created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap(),
            ..Default::default()
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
