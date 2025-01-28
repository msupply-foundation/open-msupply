use std::collections::HashMap;

use chrono::NaiveDate;
use util::inline_init;

use crate::{
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
        invoice: inline_init(|r: &mut InvoiceRow| {
            r.id = invoice_id.clone();
            r.name_link_id = String::from("name_store_b");
            r.store_id = String::from("store_c");
            r.invoice_number = 10;
            r.r#type = InvoiceRowType::OutboundShipment;
            r.status = InvoiceRowStatus::New;
            r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap();
        }),
        lines: vec![
            FullMockInvoiceLine {
                line: inline_init(|r: &mut InvoiceLineRow| {
                    r.id = invoice_line_a_id;
                    r.stock_line_id = Some(stock_line_a_id.clone());
                    r.invoice_id = invoice_id.clone();
                    r.item_link_id = String::from("item_a");
                    r.item_name = String::from("Item A");
                    r.item_code = String::from("item_a_code");
                    r.pack_size = 4;
                    r.cost_price_per_pack = 43.0;
                    r.sell_price_per_pack = 32.0;
                    r.total_before_tax = 278.26;
                    r.total_after_tax = 320.0;
                    r.tax = Some(15.0);
                    r.r#type = InvoiceLineRowType::StockOut;
                    r.number_of_packs = 10.0;
                }),
                stock_line: inline_init(|r: &mut StockLineRow| {
                    r.id = stock_line_a_id;
                    r.item_link_id = String::from("item_a");
                    r.store_id = String::from("store_c");
                    r.available_number_of_packs = 20.0;
                    r.pack_size = 4;
                    r.cost_price_per_pack = 43.0;
                    r.sell_price_per_pack = 32.0;
                    r.total_number_of_packs = 30.0;
                }),
            },
            FullMockInvoiceLine {
                line: inline_init(|r: &mut InvoiceLineRow| {
                    r.id = invoice_line_b_id;
                    r.stock_line_id = Some(stock_line_b_id.clone());
                    r.invoice_id = invoice_id.clone();
                    r.item_link_id = String::from("item_a");
                    r.item_name = String::from("Item A");
                    r.item_code = String::from("item_a_code");
                    r.pack_size = 2;
                    r.cost_price_per_pack = 41.0;
                    r.sell_price_per_pack = 21.0;
                    r.total_before_tax = 210.0;
                    r.total_after_tax = 210.0;
                    r.r#type = InvoiceLineRowType::StockOut;
                    r.number_of_packs = 2.0;
                }),
                stock_line: inline_init(|r: &mut StockLineRow| {
                    r.id = stock_line_b_id;
                    r.item_link_id = String::from("item_a");
                    r.store_id = String::from("store_c");
                    r.available_number_of_packs = 10.0;
                    r.pack_size = 2;
                    r.cost_price_per_pack = 41.0;
                    r.sell_price_per_pack = 21.0;
                    r.total_number_of_packs = 12.0;
                }),
            },
        ],
    }
}

pub fn mock_full_draft_inbound_shipment_on_hold() -> FullMockInvoice {
    let invoice_id = "on_hold_is_a".to_string();

    FullMockInvoice {
        invoice: inline_init(|r: &mut InvoiceRow| {
            r.id = invoice_id.clone();
            r.name_link_id = String::from("name_store_a");
            r.store_id = String::from("store_a");
            r.invoice_number = 11;
            r.r#type = InvoiceRowType::InboundShipment;
            r.status = InvoiceRowStatus::New;
            r.on_hold = true;
            r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap();
        }),
        lines: Vec::new(),
    }
}

pub fn mock_full_draft_outbound_shipment_on_hold() -> FullMockInvoice {
    let invoice_id = "on_hold_os_a".to_string();

    FullMockInvoice {
        invoice: inline_init(|r: &mut InvoiceRow| {
            r.id = invoice_id.clone();
            r.name_link_id = String::from("name_store_a");
            r.store_id = String::from("store_c");
            r.invoice_number = 11;
            r.r#type = InvoiceRowType::OutboundShipment;
            r.status = InvoiceRowStatus::New;
            r.on_hold = true;
            r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap();
        }),
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
