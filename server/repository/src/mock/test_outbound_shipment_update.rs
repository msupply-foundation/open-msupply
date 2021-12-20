use chrono::NaiveDate;

use crate::schema::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType, ItemRow,
    ItemType,
};

use super::MockData;

fn mock_outbound_shipment_line_no_stock_line() -> InvoiceLineRow {
    InvoiceLineRow {
        id: String::from("outbound_shipment_line_no_stock_line"),
        invoice_id: String::from("outbound_shipment_invalid_stock_line"),
        item_id: String::from("item_with_no_stock_line"),
        location_id: None,
        item_name: String::from("item_b"),
        item_code: String::from("item_b"),
        stock_line_id: None,
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 2)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 2.0,
        total_after_tax: 2.0,
        tax: None,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 1,
        note: None,
    }
}

fn mock_item_with_no_stock_line() -> ItemRow {
    ItemRow {
        id: String::from("item_with_no_stock_line"),
        name: String::from("Item with no stock line"),
        code: String::from("code"),
        unit_id: None,
        r#type: ItemType::Stock,
    }
}

// invoice containing invoice lines without stock line
fn mock_outbound_shipment_invalid_stock_line() -> InvoiceRow {
    InvoiceRow {
        id: String::from("outbound_shipment_invalid_stock_line"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceRowType::OutboundShipment,
        status: InvoiceRowStatus::New,
        on_hold: false,
        comment: Some("Sort comment test cA".to_owned()),
        their_reference: Some(String::from("")),
        created_datetime: NaiveDate::from_ymd(1970, 1, 6).and_hms_milli(15, 30, 0, 0),
        color: None,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    }
}

pub fn test_outbound_shipment_update_data() -> MockData {
    let mut data: MockData = Default::default();
    data.items.append(&mut vec![mock_item_with_no_stock_line()]);
    data.invoices
        .append(&mut vec![mock_outbound_shipment_invalid_stock_line()]);
    data.invoice_lines
        .append(&mut vec![mock_outbound_shipment_line_no_stock_line()]);
    data
}
