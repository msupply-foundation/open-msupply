use crate::{InvoiceLineRow, InvoiceLineRowType};

use chrono::NaiveDate;

pub fn mock_outbound_shipment_a_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_outbound_shipment_a_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_a_line_a"),
        invoice_id: String::from("outbound_shipment_a"),
        item_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("item_a_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 1)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 0.87,
        total_after_tax: 1.0,
        tax: Some(15.0),
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 10,
        note: None,
    };

    let mock_outbound_shipment_a_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_a_line_b"),
        invoice_id: String::from("outbound_shipment_a"),
        item_id: String::from("item_b"),
        location_id: None,
        item_name: String::from("Item B"),
        item_code: String::from("item_b_code"),
        stock_line_id: Some(String::from("item_b_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 2)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 1.74,
        total_after_tax: 2.0,
        tax: Some(15.0),
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 4,
        note: None,
    };

    vec![
        mock_outbound_shipment_a_invoice_line_a,
        mock_outbound_shipment_a_invoice_line_b,
    ]
}

pub fn mock_outbound_shipment_b_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_outbound_shipment_b_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_b_line_a"),
        invoice_id: String::from("outbound_shipment_b"),
        item_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("item_a_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 3)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 3.0,
        total_after_tax: 3.0,
        tax: None,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 3,
        note: None,
    };

    let mock_outbound_shipment_b_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_b_line_b"),
        invoice_id: String::from("outbound_shipment_b"),
        item_id: String::from("item_b"),
        item_name: String::from("Item B"),
        location_id: None,
        item_code: String::from("item_b_code"),
        stock_line_id: Some(String::from("item_b_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 4)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 4.0,
        total_after_tax: 4.0,
        tax: None,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 5,
        note: None,
    };

    vec![
        mock_outbound_shipment_b_invoice_line_a,
        mock_outbound_shipment_b_invoice_line_b,
    ]
}

pub fn mock_outbound_shipment_c_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_outbound_shipment_c_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_c_line_a"),
        invoice_id: String::from("outbound_shipment_c"),
        item_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("stock_line_ci_c_siline_a")),
        batch: Some(String::from("item_a_ci_c_siline_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 1, 4)),
        pack_size: 3,
        cost_price_per_pack: 8.0,
        sell_price_per_pack: 9.0,
        total_before_tax: 27.0,
        total_after_tax: 27.0,
        tax: None,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 3,
        note: None,
    };

    let mock_outbound_shipment_c_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_c_line_b"),
        invoice_id: String::from("outbound_shipment_c"),
        location_id: None,
        item_id: String::from("item_b"),
        item_name: String::from("Item B"),
        item_code: String::from("item_b_code"),
        stock_line_id: Some(String::from("stock_line_ci_c_siline_b")),
        batch: None,
        expiry_date: Some(NaiveDate::from_ymd(2020, 3, 23)),
        pack_size: 7,
        cost_price_per_pack: 54.0,
        sell_price_per_pack: 34.0,
        total_before_tax: 34.0,
        total_after_tax: 34.0,
        tax: None,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 1,
        note: None,
    };

    vec![
        mock_outbound_shipment_c_invoice_line_a,
        mock_outbound_shipment_c_invoice_line_b,
    ]
}

pub fn mock_outbound_shipment_d_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_outbound_shipment_d_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_d_line_a"),
        invoice_id: String::from("outbound_shipment_d"),
        item_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("stock_line_ci_d_siline_a")),
        batch: Some(String::from("stock_line_ci_d_siline_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 1, 4)),
        pack_size: 2,
        cost_price_per_pack: 10.0,
        sell_price_per_pack: 11.0,
        total_before_tax: 22.0,
        total_after_tax: 22.0,
        tax: None,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 2,
        note: None,
    };

    vec![mock_outbound_shipment_d_invoice_line_a]
}

pub fn mock_outbound_shipment_no_stock_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_outbound_shipment_no_stock_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("outbound_shipment_no_stock_line_a"),
        invoice_id: String::from("outbound_shipment_no_stock"),
        item_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: None,
        batch: None,
        expiry_date: None,
        pack_size: 0,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        tax: Some(0.0),
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: 0,
        note: None,
    };

    vec![mock_outbound_shipment_no_stock_invoice_line_a]
}

pub fn mock_inbound_shipment_a_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_inbound_shipment_a_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_a_line_a"),
        invoice_id: String::from("inbound_shipment_a"),
        item_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("item_a_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 5)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 5.0,
        total_after_tax: 5.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 1,
        note: None,
    };

    let mock_inbound_shipment_a_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_a_line_b"),
        invoice_id: String::from("inbound_shipment_a"),
        item_id: String::from("item_b"),
        location_id: None,
        item_name: String::from("Item B"),
        item_code: String::from("item_b_code"),
        stock_line_id: Some(String::from("item_b_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 6)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 6.0,
        total_after_tax: 6.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 1,
        note: None,
    };

    vec![
        mock_inbound_shipment_a_invoice_line_a,
        mock_inbound_shipment_a_invoice_line_b,
    ]
}

pub fn mock_inbound_shipment_b_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_inbound_shipment_b_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_b_line_a"),
        invoice_id: String::from("inbound_shipment_b"),
        item_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("item_a_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 7)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 7.0,
        total_after_tax: 7.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 1,
        note: None,
    };

    let mock_inbound_shipment_b_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_b_line_b"),
        invoice_id: String::from("inbound_shipment_b"),
        item_id: String::from("item_b"),
        location_id: None,
        item_name: String::from("Item B"),
        item_code: String::from("item_b_code"),
        stock_line_id: Some(String::from("item_b_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 8)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 8.0,
        total_after_tax: 8.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 1,
        note: None,
    };

    vec![
        mock_inbound_shipment_b_invoice_line_a,
        mock_inbound_shipment_b_invoice_line_b,
    ]
}

pub fn mock_inbound_shipment_c_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_inbound_shipment_c_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_c_line_a"),
        invoice_id: String::from("inbound_shipment_c"),
        item_id: String::from("item_a"),
        location_id: Some("location_1".to_owned()),
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: None,
        batch: Some(String::from("item_a_si_c_siline_a")),
        expiry_date: None,
        pack_size: 1,
        cost_price_per_pack: 7.0,
        sell_price_per_pack: 5.0,
        total_before_tax: 21.0,
        total_after_tax: 21.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 3,
        note: None,
    };

    let mock_inbound_shipment_c_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_c_line_b"),
        invoice_id: String::from("inbound_shipment_c"),
        item_id: String::from("item_b"),
        location_id: None,
        item_name: String::from("Item B"),
        item_code: String::from("item_b_code"),
        stock_line_id: None,
        batch: Some(String::from("item_b_si_c_siline_b")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 8)),
        pack_size: 1,
        cost_price_per_pack: 4.0,
        sell_price_per_pack: 2.0,
        total_before_tax: 8.0,
        total_after_tax: 8.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 2,
        note: None,
    };

    vec![
        mock_inbound_shipment_c_invoice_line_a,
        mock_inbound_shipment_c_invoice_line_b,
    ]
}

pub fn mock_inbound_shipment_d_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_inbound_shipment_d_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_d_line_a"),
        invoice_id: String::from("inbound_shipment_d"),
        item_id: String::from("item_a"),
        location_id: None,
        item_name: String::from("Item A"),
        item_code: String::from("item_a_code"),
        stock_line_id: Some(String::from("stock_line_si_d_siline_a")),
        batch: Some(String::from("item_a_si_d_siline_a")),
        expiry_date: None,
        pack_size: 1,
        cost_price_per_pack: 2.0,
        sell_price_per_pack: 18.0,
        total_before_tax: 14.0,
        total_after_tax: 14.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 7,
        note: None,
    };

    let mock_inbound_shipment_d_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("inbound_shipment_d_line_b"),
        invoice_id: String::from("inbound_shipment_d"),
        item_id: String::from("item_b"),
        location_id: Some("location_1".to_owned()),
        item_name: String::from("Item B"),
        item_code: String::from("item_b_code"),
        stock_line_id: Some(String::from("stock_line_si_d_siline_b")),
        batch: Some(String::from("item_b_si_c_siline_d")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 11)),
        pack_size: 3,
        cost_price_per_pack: 45.0,
        sell_price_per_pack: 34.0,
        total_before_tax: 270.0,
        total_after_tax: 270.0,
        tax: None,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: 2,
        note: None,
    };

    vec![
        mock_inbound_shipment_d_invoice_line_a,
        mock_inbound_shipment_d_invoice_line_b,
    ]
}

pub fn mock_outbound_shipment_invoice_lines() -> Vec<InvoiceLineRow> {
    let mut mock_outbound_shipment_invoice_lines = Vec::new();

    mock_outbound_shipment_invoice_lines.extend(mock_outbound_shipment_a_invoice_lines());
    mock_outbound_shipment_invoice_lines.extend(mock_outbound_shipment_b_invoice_lines());
    mock_outbound_shipment_invoice_lines.extend(mock_outbound_shipment_c_invoice_lines());
    mock_outbound_shipment_invoice_lines.extend(mock_outbound_shipment_d_invoice_lines());
    mock_outbound_shipment_invoice_lines.extend(mock_outbound_shipment_no_stock_invoice_lines());

    mock_outbound_shipment_invoice_lines
}

pub fn mock_inbound_shipment_invoice_lines() -> Vec<InvoiceLineRow> {
    let mut mock_inbound_shipment_invoice_lines = Vec::new();

    mock_inbound_shipment_invoice_lines.extend(mock_inbound_shipment_a_invoice_lines());
    mock_inbound_shipment_invoice_lines.extend(mock_inbound_shipment_b_invoice_lines());
    mock_inbound_shipment_invoice_lines.extend(mock_inbound_shipment_c_invoice_lines());
    mock_inbound_shipment_invoice_lines.extend(mock_inbound_shipment_d_invoice_lines());

    mock_inbound_shipment_invoice_lines
}

pub fn mock_invoice_lines() -> Vec<InvoiceLineRow> {
    let mut mock_invoice_lines: Vec<InvoiceLineRow> = Vec::new();

    mock_invoice_lines.extend(mock_outbound_shipment_invoice_lines());
    mock_invoice_lines.extend(mock_inbound_shipment_invoice_lines());

    mock_invoice_lines
}
