use chrono::{Duration, Utc};
use util::{constants::AVG_NUMBER_OF_DAYS_IN_A_MONTH, uuid::uuid};

use crate::{
    InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceType, ItemRow, ItemType, StockLineRow,
};

use super::{mock_name_a, mock_store_a, mock_store_b, MockData};

const ITEM1_INDEX: usize = 0;
const ITEM2_INDEX: usize = 1;

fn consumption_points() -> MockData {
    let invoice_id = uuid();
    MockData {
        invoices: vec![InvoiceRow {
            id: invoice_id.clone(),
            store_id: mock_store_a().id,
            name_link_id: mock_name_a().id,
            r#type: InvoiceType::OutboundShipment,
            ..Default::default()
        }],
        invoice_lines: vec![
            InvoiceLineRow {
                id: format!("{}line1", invoice_id),
                invoice_id: invoice_id.clone(),
                item_link_id: item().id,
                r#type: InvoiceLineType::StockOut,
                pack_size: 1.0,
                ..Default::default()
            },
            InvoiceLineRow {
                id: format!("{}line2", invoice_id),
                invoice_id: invoice_id.clone(),
                item_link_id: item2().id,
                r#type: InvoiceLineType::StockOut,
                pack_size: 1.0,
                ..Default::default()
            },
        ],
        ..Default::default()
    }
}

pub fn mock_item_stats() -> MockData {
    MockData {
        items: vec![item(), item2()],
        stock_lines: vec![
            stock_line1(),
            stock_line2(),
            stock_line3(),
            stock_line_1_store_b(),
            stock_line1_item2(),
        ],
        ..Default::default()
    }
    .join({
        let mut u = consumption_points();
        u.invoices[0].picked_datetime = Some(Utc::now().naive_utc() - Duration::days(3));
        u.invoice_lines[ITEM1_INDEX].number_of_packs = 5.0;
        u.invoice_lines[ITEM1_INDEX].pack_size = 3.0;
        // Don't want item2 invoice line for 1 month calculation
        u.invoice_lines.remove(ITEM2_INDEX);
        u
    })
    .join({
        let mut u = consumption_points();
        u.invoices[0].picked_datetime = Some(
            Utc::now().naive_utc() - Duration::days((AVG_NUMBER_OF_DAYS_IN_A_MONTH + 2.0) as i64),
        );
        u.invoice_lines[ITEM1_INDEX].number_of_packs = 1000.0;
        u.invoice_lines[ITEM2_INDEX].number_of_packs = 30.0;
        u
    })
    .join({
        let mut u = consumption_points();
        u.invoices[0].picked_datetime = Some(
            Utc::now().naive_utc()
                - Duration::days((AVG_NUMBER_OF_DAYS_IN_A_MONTH * 3.0 + 1.0) as i64),
        );
        u.invoice_lines[ITEM1_INDEX].number_of_packs = 100000.0;
        u.invoice_lines[ITEM2_INDEX].number_of_packs = 100000.0;
        u
    })
    .join({
        let mut u = consumption_points();
        u.invoices[0].picked_datetime = Some(
            Utc::now().naive_utc() - Duration::days((AVG_NUMBER_OF_DAYS_IN_A_MONTH * 2.0) as i64),
        );
        u.invoices[0].store_id = mock_store_b().id;
        u.invoice_lines[ITEM1_INDEX].number_of_packs = 50.0;
        u
    })
}

pub fn item1_amc_3_months() -> f64 {
    (3 * 5 + 1000) as f64 / 3.0
}

pub fn item2_amc_3_months() -> f64 {
    30.0 / 3.0
}

pub fn item1_amc_1_months() -> f64 {
    (3 * 5) as f64 / 1.0
}

pub fn item1_amc_3_months_store_b() -> f64 {
    50.0 / 3.0
}

pub fn item() -> ItemRow {
    let id = "item".to_string();
    ItemRow {
        id: id.clone(),
        name: id.clone(),
        code: id.clone(),
        r#type: ItemType::Stock,
        ..Default::default()
    }
}

pub fn stock_line1() -> StockLineRow {
    let id = "stock_line1".to_string();
    StockLineRow {
        id: id.clone(),
        item_link_id: item().id,
        store_id: mock_store_a().id,
        pack_size: 10.0,
        available_number_of_packs: 1.0,
        total_number_of_packs: 40.0,
        supplier_link_id: Some(String::from("name_store_b")),
        ..Default::default()
    }
}

pub fn stock_line2() -> StockLineRow {
    let id = "stock_line2".to_string();
    StockLineRow {
        id: id.clone(),
        item_link_id: item().id,
        store_id: mock_store_a().id,
        available_number_of_packs: 20.0,
        pack_size: 10.0,
        total_number_of_packs: 40.0,
        supplier_link_id: Some(String::from("name_store_b")),
        ..Default::default()
    }
}

pub fn stock_line3() -> StockLineRow {
    let id = "stock_line3".to_string();
    StockLineRow {
        id: id.clone(),
        item_link_id: item().id,
        store_id: mock_store_a().id,
        available_number_of_packs: 10.0,
        pack_size: 1.0,
        total_number_of_packs: 40.0,
        supplier_link_id: Some(String::from("name_store_b")),
        ..Default::default()
    }
}

pub fn item_1_soh() -> f64 {
    10.0 + 20.0 * 10.0 + 10.0
}

pub fn stock_line_1_store_b() -> StockLineRow {
    let id = "stock_line_1_store_b".to_string();
    StockLineRow {
        id: id.clone(),
        item_link_id: item().id,
        store_id: mock_store_b().id,
        available_number_of_packs: 1.0,
        pack_size: 10.0,
        total_number_of_packs: 40.0,
        supplier_link_id: Some(String::from("name_store_b")),
        ..Default::default()
    }
}

pub fn item_1_store_b_soh() -> f64 {
    10.0
}

pub fn item2() -> ItemRow {
    let id = "item2".to_string();
    ItemRow {
        id: id.clone(),
        name: id.clone(),
        code: id.clone(),
        r#type: ItemType::Stock,
        ..Default::default()
    }
}

pub fn stock_line1_item2() -> StockLineRow {
    let id = "stock_line1_item2".to_string();
    StockLineRow {
        id: id.clone(),
        item_link_id: item2().id,
        store_id: mock_store_a().id,
        available_number_of_packs: 11.0,
        pack_size: 2.0,
        total_number_of_packs: 40.0,
        supplier_link_id: Some(String::from("name_store_b")),
        ..Default::default()
    }
}

pub fn item_2_soh() -> f64 {
    2.0 * 11.0
}
