use std::collections::HashMap;

use chrono::NaiveDate;

use crate::{
    db_diesel::{InvoiceRepository, StorageConnection},
    schema::{InvoiceLineRow, InvoiceRow, InvoiceRowStatus, InvoiceRowType, StockLineRow},
    InvoiceLineRowRepository, StockLineRowRepository,
};

pub struct FullMockInvoiceLine {
    pub line: InvoiceLineRow,
    pub stock_line: StockLineRow,
}

pub struct FullMockInvoice {
    pub invoice: InvoiceRow,
    pub lines: Vec<FullMockInvoiceLine>,
}

impl FullMockInvoice {
    pub fn get_lines(&self) -> Vec<InvoiceLineRow> {
        self.lines
            .iter()
            .map(|full_line| full_line.line.clone())
            .collect()
    }
}

pub fn mock_full_draft_outbound_shipment_a() -> FullMockInvoice {
    let invoice_id = "draft_ci_a".to_string();
    let invoice_line_a_id = "draft_ci_a_line_a".to_string();
    let invoice_line_b_id = "draft_ci_a_line_b".to_string();
    let stock_line_a_id = "draft_ci_a_stock_line_a".to_string();
    let stock_line_b_id = "draft_ci_a_stock_line_b".to_string();

    FullMockInvoice {
        invoice: InvoiceRow {
            id: invoice_id.clone(),
            name_id: String::from("name_store_a"),
            store_id: String::from("store_b"),
            invoice_number: 10,
            r#type: InvoiceRowType::OutboundShipment,
            status: InvoiceRowStatus::New,
            on_hold: false,
            comment: None,
            their_reference: None,
            created_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
            allocated_datetime: None,
            shipped_datetime: None,
            color: None,
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
                    total_after_tax: 320.0,
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
                    total_after_tax: 210.0,
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
            r#type: InvoiceRowType::InboundShipment,
            status: InvoiceRowStatus::New,
            on_hold: true,
            comment: None,
            their_reference: None,
            created_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
            allocated_datetime: None,
            color: None,
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
            r#type: InvoiceRowType::OutboundShipment,
            status: InvoiceRowStatus::New,
            on_hold: true,
            comment: None,
            their_reference: None,
            created_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
            allocated_datetime: None,
            color: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
        },
        lines: Vec::new(),
    }
}

pub fn insert_full_mock_invoice(invoice: &FullMockInvoice, connection: &StorageConnection) {
    InvoiceRepository::new(&connection)
        .upsert_one(&invoice.invoice)
        .unwrap();
    for line in invoice.lines.iter() {
        StockLineRowRepository::new(&connection)
            .upsert_one(&line.stock_line)
            .unwrap();
        InvoiceLineRowRepository::new(&connection)
            .upsert_one(&line.line)
            .unwrap();
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
