use chrono::{Duration, NaiveDate, Utc};
use util::inline_init;

use crate::schema::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType, ItemRow,
    ItemRowType, StockLineRow,
};

use super::{
    common::{FullMockInvoice, FullMockInvoiceLine},
    mock_name_a, mock_store_a, mock_store_b, MockData,
};

pub fn mock_test_item_stats_repository() -> MockData {
    let mut result = MockData::default();
    result.items.push(mock_item_stats_item1());
    result.items.push(mock_item_stats_item2());

    result
        .stock_lines
        .push(mock_item_stats_item1_stock_line1_store_a());
    result
        .stock_lines
        .push(mock_item_stats_item1_stock_line2_store_a());
    result
        .stock_lines
        .push(mock_item_stats_item1_stock_line3_store_a());
    result
        .stock_lines
        .push(mock_item_stats_item1_stock_line1_store_b());
    result
        .stock_lines
        .push(mock_item_stats_item2_stock_line1_store_a());

    result.full_invoices = vec![
        (
            "mock_item_stats_invoice1_store_a".to_string(),
            mock_item_stats_invoice1_store_a(),
        ),
        (
            "mock_item_stats_invoice2_store_a".to_string(),
            mock_item_stats_invoice2_store_a(),
        ),
        (
            "mock_item_stats_invoice1_store_b".to_string(),
            mock_item_stats_invoice1_store_b(),
        ),
    ]
    .into_iter()
    .collect();

    result
}

pub fn mock_item_stats_item1() -> ItemRow {
    let id = "mock_item_stats_item1".to_string();
    ItemRow {
        id: id.clone(),
        name: id.clone(),
        code: id.clone(),
        unit_id: None,
        r#type: ItemRowType::Stock,
    }
}

pub fn mock_item_stats_item1_stock_line1_store_a() -> StockLineRow {
    let id = "mock_item_stats_item1_stock_line1_store_a".to_string();
    StockLineRow {
        id: id.clone(),
        item_id: mock_item_stats_item1().id,
        store_id: mock_store_a().id,
        available_number_of_packs: 0,
        pack_size: 10,

        total_number_of_packs: 40,
        location_id: None,
        batch: None,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        expiry_date: None,
        on_hold: false,
        note: None,
    }
}

pub fn mock_item_stats_item1_stock_line2_store_a() -> StockLineRow {
    let id = "mock_item_stats_item1_stock_line2_store_a".to_string();
    StockLineRow {
        id: id.clone(),
        item_id: mock_item_stats_item1().id,
        store_id: mock_store_a().id,
        available_number_of_packs: 20,
        pack_size: 10,

        total_number_of_packs: 40,
        location_id: None,
        batch: None,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        expiry_date: None,
        on_hold: false,
        note: None,
    }
}

pub fn mock_item_stats_item1_stock_line3_store_a() -> StockLineRow {
    let id = "mock_item_stats_item1_stock_line3_store_a".to_string();
    StockLineRow {
        id: id.clone(),
        item_id: mock_item_stats_item1().id,
        store_id: mock_store_a().id,
        available_number_of_packs: 10,
        pack_size: 1,

        total_number_of_packs: 40,
        location_id: None,
        batch: None,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        expiry_date: None,
        on_hold: false,
        note: None,
    }
}

pub fn mock_item_stats_item1_stock_line1_store_b() -> StockLineRow {
    let id = "mock_item_stats_item1_stock_line1_store_b".to_string();
    StockLineRow {
        id: id.clone(),
        item_id: mock_item_stats_item1().id,
        store_id: mock_store_b().id,
        available_number_of_packs: 1,
        pack_size: 10,

        total_number_of_packs: 40,
        location_id: None,
        batch: None,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        expiry_date: None,
        on_hold: false,
        note: None,
    }
}

pub fn mock_item_stats_item2() -> ItemRow {
    let id = "mock_item_stats_item2".to_string();
    ItemRow {
        id: id.clone(),
        name: id.clone(),
        code: id.clone(),
        unit_id: None,
        r#type: ItemRowType::Stock,
    }
}

pub fn mock_item_stats_item2_stock_line1_store_a() -> StockLineRow {
    let id = "mock_item_stats_item2_stock_line1_store_a".to_string();
    StockLineRow {
        id: id.clone(),
        item_id: mock_item_stats_item2().id,
        store_id: mock_store_a().id,
        available_number_of_packs: 11,
        pack_size: 2,

        total_number_of_packs: 40,
        location_id: None,
        batch: None,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        expiry_date: None,
        on_hold: false,
        note: None,
    }
}

pub fn mock_item_stats_invoice1_store_a() -> FullMockInvoice {
    let invoice_id = "mock_item_stats_invoice1_store_a".to_owned();
    let line1_id = format!("{}1", invoice_id);
    let line2_id = format!("{}2", invoice_id);

    FullMockInvoice {
        invoice: inline_init(|r: &mut InvoiceRow| {
            r.id = invoice_id.clone();
            r.name_id = mock_name_a().id;
            r.store_id = mock_store_a().id;
            r.picked_datetime = Some(Utc::now().naive_utc() - Duration::days(3));
            r.r#type = InvoiceRowType::OutboundShipment;
            r.invoice_number = 20;
            r.status = InvoiceRowStatus::New;
            r.created_datetime = NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0);
        }),
        lines: vec![
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line1_id.clone(),
                    invoice_id: invoice_id.clone(),
                    pack_size: 4,
                    number_of_packs: 10,
                    item_id: mock_item_stats_item1().id,
                    item_name: mock_item_stats_item1().name,
                    item_code: mock_item_stats_item1().code,

                    stock_line_id: None,
                    location_id: None,
                    batch: None,
                    expiry_date: None,
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
                    total_before_tax: 0.0,
                    total_after_tax: 0.0,
                    tax: Some(0.0),
                    r#type: InvoiceLineRowType::StockOut,
                    note: None,
                },
                stock_line: mock_item_stats_item1_stock_line1_store_a(),
            },
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line2_id.clone(),
                    invoice_id: invoice_id.clone(),
                    pack_size: 2,
                    number_of_packs: 2,
                    item_id: mock_item_stats_item1().id,
                    item_name: mock_item_stats_item1().name,
                    item_code: mock_item_stats_item1().code,

                    stock_line_id: None,
                    location_id: None,
                    batch: None,
                    expiry_date: None,
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
                    total_before_tax: 0.0,
                    total_after_tax: 0.0,
                    tax: Some(0.0),
                    r#type: InvoiceLineRowType::StockOut,
                    note: None,
                },
                stock_line: mock_item_stats_item1_stock_line2_store_a(),
            },
        ],
    }
}

pub fn mock_item_stats_invoice2_store_a() -> FullMockInvoice {
    let invoice_id = "mock_item_stats_invoice2_store_a".to_owned();
    let line1_id = format!("{}1", invoice_id);
    let line2_id = format!("{}2", invoice_id);

    FullMockInvoice {
        invoice: inline_init(|r: &mut InvoiceRow| {
            r.id = invoice_id.clone();
            r.name_id = mock_name_a().id;
            r.store_id = mock_store_a().id;
            r.picked_datetime = Some(Utc::now().naive_utc() - Duration::days(30));
            r.r#type = InvoiceRowType::OutboundShipment;
            r.invoice_number = 20;
            r.status = InvoiceRowStatus::New;
            r.created_datetime = NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0);
        }),
        lines: vec![
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line1_id.clone(),
                    invoice_id: invoice_id.clone(),
                    pack_size: 1,
                    number_of_packs: 15,
                    item_id: mock_item_stats_item2().id,
                    item_name: mock_item_stats_item2().name,
                    item_code: mock_item_stats_item2().code,

                    stock_line_id: None,
                    location_id: None,
                    batch: None,
                    expiry_date: None,
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
                    total_before_tax: 0.0,
                    total_after_tax: 0.0,
                    tax: Some(0.0),
                    r#type: InvoiceLineRowType::StockOut,
                    note: None,
                },
                stock_line: mock_item_stats_item2_stock_line1_store_a(),
            },
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line2_id.clone(),
                    invoice_id: invoice_id.clone(),
                    pack_size: 3,
                    number_of_packs: 1,
                    item_id: mock_item_stats_item1().id,
                    item_name: mock_item_stats_item1().name,
                    item_code: mock_item_stats_item1().code,

                    stock_line_id: None,
                    location_id: None,
                    batch: None,
                    expiry_date: None,
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
                    total_before_tax: 0.0,
                    total_after_tax: 0.0,
                    tax: Some(0.0),
                    r#type: InvoiceLineRowType::StockOut,
                    note: None,
                },
                stock_line: mock_item_stats_item1_stock_line3_store_a(),
            },
        ],
    }
}

pub fn mock_item_stats_invoice1_store_b() -> FullMockInvoice {
    let invoice_id = "mock_item_stats_invoice1_store_b".to_owned();
    let line1_id = format!("{}1", invoice_id);
    let line2_id = format!("{}2", invoice_id);

    FullMockInvoice {
        invoice: inline_init(|r: &mut InvoiceRow| {
            r.id = invoice_id.clone();
            r.name_id = mock_name_a().id;
            r.store_id = mock_store_b().id;
            r.picked_datetime = Some(Utc::now().naive_utc() - Duration::days(3));
            r.r#type = InvoiceRowType::OutboundShipment;
            r.invoice_number = 20;
            r.status = InvoiceRowStatus::New;
            r.created_datetime = NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0);
        }),
        lines: vec![
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line1_id.clone(),
                    invoice_id: invoice_id.clone(),
                    pack_size: 100,
                    number_of_packs: 200,
                    item_id: mock_item_stats_item1().id,
                    item_name: mock_item_stats_item1().name,
                    item_code: mock_item_stats_item1().code,

                    stock_line_id: None,
                    location_id: None,
                    batch: None,
                    expiry_date: None,
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
                    total_before_tax: 0.0,
                    total_after_tax: 0.0,
                    tax: Some(0.0),
                    r#type: InvoiceLineRowType::StockOut,
                    note: None,
                },
                stock_line: mock_item_stats_item1_stock_line1_store_b(),
            },
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line2_id.clone(),
                    invoice_id: invoice_id.clone(),
                    pack_size: 300,
                    number_of_packs: 1,
                    item_id: mock_item_stats_item2().id,
                    item_name: mock_item_stats_item2().name,
                    item_code: mock_item_stats_item2().code,

                    stock_line_id: None,
                    location_id: None,
                    batch: None,
                    expiry_date: None,
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
                    total_before_tax: 0.0,
                    total_after_tax: 0.0,
                    tax: Some(0.0),
                    r#type: InvoiceLineRowType::StockOut,
                    note: None,
                },
                stock_line: mock_item_stats_item1_stock_line1_store_b(),
            },
        ],
    }
}
