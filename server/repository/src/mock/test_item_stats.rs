use chrono::{Duration, Utc};
use util::{constants::NUMBER_OF_DAYS_IN_A_MONTH, inline_edit, inline_init, uuid::uuid};

use crate::{
    InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceType, ItemRow, ItemType, StockLineRow,
};

use super::{mock_name_a, mock_store_a, mock_store_b, MockData};

const ITEM1_INDEX: usize = 0;
const ITEM2_INDEX: usize = 1;

fn consumption_points() -> MockData {
    let invoice_id = uuid();
    inline_init(|r: &mut MockData| {
        r.invoices = vec![inline_init(|r: &mut InvoiceRow| {
            r.id = invoice_id.clone();
            r.store_id = mock_store_a().id;
            r.name_link_id = mock_name_a().id;
            r.r#type = InvoiceType::OutboundShipment;
        })];
        r.invoice_lines = vec![
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = format!("{}line1", invoice_id);
                r.invoice_id = invoice_id.clone();
                r.item_link_id = item().id;
                r.r#type = InvoiceLineType::StockOut;
                r.pack_size = 1.0;
            }),
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = format!("{}line2", invoice_id);
                r.invoice_id = invoice_id.clone();
                r.item_link_id = item2().id;
                r.r#type = InvoiceLineType::StockOut;
                r.pack_size = 1.0;
            }),
        ];
    })
}

pub fn mock_item_stats() -> MockData {
    inline_init(|r: &mut MockData| {
        r.items = vec![item(), item2()];
        r.stock_lines = vec![
            stock_line1(),
            stock_line2(),
            stock_line3(),
            stock_line_1_store_b(),
            stock_line1_item2(),
        ];
    })
    .join(inline_edit(&consumption_points(), |mut u| {
        u.invoices[0].picked_datetime = Some(Utc::now().naive_utc() - Duration::days(3));
        u.invoice_lines[ITEM1_INDEX].number_of_packs = 5.0;
        u.invoice_lines[ITEM1_INDEX].pack_size = 3.0;
        // Don't want item2 invoice line for 1 month calculation
        u.invoice_lines.remove(ITEM2_INDEX);
        u
    }))
    .join(inline_edit(&consumption_points(), |mut u| {
        u.invoices[0].picked_datetime =
            Some(Utc::now().naive_utc() - Duration::days((NUMBER_OF_DAYS_IN_A_MONTH + 2.0) as i64));
        u.invoice_lines[ITEM1_INDEX].number_of_packs = 1000.0;
        u.invoice_lines[ITEM2_INDEX].number_of_packs = 30.0;
        u
    }))
    .join(inline_edit(&consumption_points(), |mut u| {
        u.invoices[0].picked_datetime = Some(
            Utc::now().naive_utc() - Duration::days((NUMBER_OF_DAYS_IN_A_MONTH * 3.0 + 1.0) as i64),
        );
        u.invoice_lines[ITEM1_INDEX].number_of_packs = 100000.0;
        u.invoice_lines[ITEM2_INDEX].number_of_packs = 100000.0;
        u
    }))
    .join(inline_edit(&consumption_points(), |mut u| {
        u.invoices[0].picked_datetime =
            Some(Utc::now().naive_utc() - Duration::days((NUMBER_OF_DAYS_IN_A_MONTH * 2.0) as i64));
        u.invoices[0].store_id = mock_store_b().id;
        u.invoice_lines[ITEM1_INDEX].number_of_packs = 50.0;
        u
    }))
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
    inline_init(|r: &mut ItemRow| {
        r.id = id.clone();
        r.name = id.clone();
        r.code = id.clone();
        r.r#type = ItemType::Stock;
    })
}

pub fn stock_line1() -> StockLineRow {
    let id = "stock_line1".to_string();
    inline_init(|r: &mut StockLineRow| {
        r.id = id.clone();
        r.item_link_id = item().id;
        r.store_id = mock_store_a().id;
        r.pack_size = 10.0;
        r.available_number_of_packs = 1.0;
        r.total_number_of_packs = 40.0;
        r.supplier_link_id = Some(String::from("name_store_b"));
    })
}

pub fn stock_line2() -> StockLineRow {
    let id = "stock_line2".to_string();
    inline_init(|r: &mut StockLineRow| {
        r.id = id.clone();
        r.item_link_id = item().id;
        r.store_id = mock_store_a().id;
        r.available_number_of_packs = 20.0;
        r.pack_size = 10.0;
        r.total_number_of_packs = 40.0;
        r.supplier_link_id = Some(String::from("name_store_b"));
    })
}

pub fn stock_line3() -> StockLineRow {
    let id = "stock_line3".to_string();
    inline_init(|r: &mut StockLineRow| {
        r.id = id.clone();
        r.item_link_id = item().id;
        r.store_id = mock_store_a().id;
        r.available_number_of_packs = 10.0;
        r.pack_size = 1.0;
        r.total_number_of_packs = 40.0;
        r.supplier_link_id = Some(String::from("name_store_b"));
    })
}

pub fn item_1_soh() -> f64 {
    10.0 + 20.0 * 10.0 + 10.0
}

pub fn stock_line_1_store_b() -> StockLineRow {
    let id = "stock_line_1_store_b".to_string();
    inline_init(|r: &mut StockLineRow| {
        r.id = id.clone();
        r.item_link_id = item().id;
        r.store_id = mock_store_b().id;
        r.available_number_of_packs = 1.0;
        r.pack_size = 10.0;
        r.total_number_of_packs = 40.0;
        r.supplier_link_id = Some(String::from("name_store_b"));
    })
}

pub fn item_1_store_b_soh() -> f64 {
    10.0
}

pub fn item2() -> ItemRow {
    let id = "item2".to_string();
    inline_init(|r: &mut ItemRow| {
        r.id = id.clone();
        r.name = id.clone();
        r.code = id.clone();
        r.r#type = ItemType::Stock;
    })
}

pub fn stock_line1_item2() -> StockLineRow {
    let id = "stock_line1_item2".to_string();
    inline_init(|r: &mut StockLineRow| {
        r.id = id.clone();
        r.item_link_id = item2().id;
        r.store_id = mock_store_a().id;
        r.available_number_of_packs = 11.0;
        r.pack_size = 2.0;
        r.total_number_of_packs = 40.0;
        r.supplier_link_id = Some(String::from("name_store_b"));
    })
}

pub fn item_2_soh() -> f64 {
    2.0 * 11.0
}
