use crate::database::schema::InvoiceLineRow;

use chrono::NaiveDate;

pub fn mock_customer_invoice_a_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_customer_invoice_a_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("customer_invoice_a_line_a"),
        invoice_id: String::from("customer_invoice_a"),
        item_id: String::from("item_a"),
        item_name: String::from("item_a"),
        item_code: String::from("item_a"),
        stock_line_id: Some(String::from("item_a_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 1)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_after_tax: 1.0,
        number_of_packs: 1,
    };

    let mock_customer_invoice_a_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("customer_invoice_a_line_b"),
        invoice_id: String::from("customer_invoice_a"),
        item_id: String::from("item_b"),
        item_name: String::from("item_b"),
        item_code: String::from("item_b"),
        stock_line_id: Some(String::from("item_b_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 2)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_after_tax: 2.0,
        number_of_packs: 1,
    };

    vec![
        mock_customer_invoice_a_invoice_line_a,
        mock_customer_invoice_a_invoice_line_b,
    ]
}

pub fn mock_customer_invoice_b_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_customer_invoice_b_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("customer_invoice_b_line_a"),
        invoice_id: String::from("customer_invoice_b"),
        item_id: String::from("item_a"),
        item_name: String::from("item_a"),
        item_code: String::from("item_a"),
        stock_line_id: Some(String::from("item_a_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 3)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_after_tax: 3.0,
        number_of_packs: 1,
    };

    let mock_customer_invoice_b_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("customer_invoice_b_line_b"),
        invoice_id: String::from("customer_invoice_b"),
        item_id: String::from("item_b"),
        item_name: String::from("item_b"),
        item_code: String::from("item_b"),
        stock_line_id: Some(String::from("item_b_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 4)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_after_tax: 4.0,
        number_of_packs: 1,
    };

    vec![
        mock_customer_invoice_b_invoice_line_a,
        mock_customer_invoice_b_invoice_line_b,
    ]
}

pub fn mock_supplier_invoice_a_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_supplier_invoice_a_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("supplier_invoice_a_line_a"),
        invoice_id: String::from("supplier_invoice_a"),
        item_id: String::from("item_a"),
        item_name: String::from("item_a"),
        item_code: String::from("item_a"),
        stock_line_id: Some(String::from("item_a_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 5)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_after_tax: 5.0,
        number_of_packs: 1,
    };

    let mock_supplier_invoice_a_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("supplier_invoice_a_line_b"),
        invoice_id: String::from("supplier_invoice_a"),
        item_id: String::from("item_b"),
        item_name: String::from("item_b"),
        item_code: String::from("item_b"),
        stock_line_id: Some(String::from("item_b_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 6)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_after_tax: 6.0,
        number_of_packs: 1,
    };

    vec![
        mock_supplier_invoice_a_invoice_line_a,
        mock_supplier_invoice_a_invoice_line_b,
    ]
}

pub fn mock_supplier_invoice_b_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_supplier_invoice_b_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("supplier_invoice_b_line_a"),
        invoice_id: String::from("supplier_invoice_b"),
        item_id: String::from("item_a"),
        item_name: String::from("item_a"),
        item_code: String::from("item_a"),
        stock_line_id: Some(String::from("item_a_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 7)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_after_tax: 7.0,
        number_of_packs: 1,
    };

    let mock_supplier_invoice_b_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("supplier_invoice_b_line_b"),
        invoice_id: String::from("supplier_invoice_b"),
        item_id: String::from("item_b"),
        item_name: String::from("item_b"),
        item_code: String::from("item_b"),
        stock_line_id: Some(String::from("item_b_line_a")),
        batch: Some(String::from("item_a_line_a")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 8)),
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_after_tax: 8.0,
        number_of_packs: 1,
    };

    vec![
        mock_supplier_invoice_b_invoice_line_a,
        mock_supplier_invoice_b_invoice_line_b,
    ]
}

pub fn mock_supplier_invoice_c_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_supplier_invoice_c_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("supplier_invoice_c_line_a"),
        invoice_id: String::from("supplier_invoice_c"),
        item_id: String::from("item_a"),
        item_name: String::from("item_a"),
        item_code: String::from("item_a"),
        stock_line_id: None,
        batch: Some(String::from("item_a_si_c_siline_a")),
        expiry_date: None,
        pack_size: 1,
        cost_price_per_pack: 7.0,
        sell_price_per_pack: 5.0,
        total_after_tax: 21.0,
        number_of_packs: 3,
    };

    let mock_supplier_invoice_c_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("supplier_invoice_c_line_b"),
        invoice_id: String::from("supplier_invoice_c"),
        item_id: String::from("item_b"),
        item_name: String::from("item_b"),
        item_code: String::from("item_b"),
        stock_line_id: None,
        batch: Some(String::from("item_b_si_c_siline_b")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 8)),
        pack_size: 1,
        cost_price_per_pack: 4.0,
        sell_price_per_pack: 2.0,
        total_after_tax: 8.0,
        number_of_packs: 2,
    };

    vec![
        mock_supplier_invoice_c_invoice_line_a,
        mock_supplier_invoice_c_invoice_line_b,
    ]
}

pub fn mock_supplier_invoice_d_invoice_lines() -> Vec<InvoiceLineRow> {
    let mock_supplier_invoice_d_invoice_line_a: InvoiceLineRow = InvoiceLineRow {
        id: String::from("supplier_invoice_d_line_a"),
        invoice_id: String::from("supplier_invoice_d"),
        item_id: String::from("item_a"),
        item_name: String::from("item_a"),
        item_code: String::from("item_a"),
        stock_line_id: Some(String::from("stock_line_si_d_siline_a")),
        batch: Some(String::from("item_a_si_d_siline_a")),
        expiry_date: None,
        pack_size: 1,
        cost_price_per_pack: 2.0,
        sell_price_per_pack: 18.0,
        total_after_tax: 14.0,
        number_of_packs: 7,
    };

    let mock_supplier_invoice_d_invoice_line_b: InvoiceLineRow = InvoiceLineRow {
        id: String::from("supplier_invoice_d_line_b"),
        invoice_id: String::from("supplier_invoice_d"),
        item_id: String::from("item_b"),
        item_name: String::from("item_b"),
        item_code: String::from("item_b"),
        stock_line_id: Some(String::from("stock_line_si_d_siline_b")),
        batch: Some(String::from("item_b_si_c_siline_d")),
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 11)),
        pack_size: 3,
        cost_price_per_pack: 45.0,
        sell_price_per_pack: 34.0,
        total_after_tax: 270.0,
        number_of_packs: 2,
    };

    vec![
        mock_supplier_invoice_d_invoice_line_a,
        mock_supplier_invoice_d_invoice_line_b,
    ]
}

pub fn mock_customer_invoice_invoice_lines() -> Vec<InvoiceLineRow> {
    let mut mock_customer_invoice_invoice_lines = Vec::new();

    mock_customer_invoice_invoice_lines.extend(mock_customer_invoice_a_invoice_lines());
    mock_customer_invoice_invoice_lines.extend(mock_customer_invoice_b_invoice_lines());

    mock_customer_invoice_invoice_lines
}

pub fn mock_supplier_invoice_invoice_lines() -> Vec<InvoiceLineRow> {
    let mut mock_supplier_invoice_invoice_lines = Vec::new();

    mock_supplier_invoice_invoice_lines.extend(mock_supplier_invoice_a_invoice_lines());
    mock_supplier_invoice_invoice_lines.extend(mock_supplier_invoice_b_invoice_lines());
    mock_supplier_invoice_invoice_lines.extend(mock_supplier_invoice_c_invoice_lines());
    mock_supplier_invoice_invoice_lines.extend(mock_supplier_invoice_d_invoice_lines());

    mock_supplier_invoice_invoice_lines
}

pub fn mock_invoice_lines() -> Vec<InvoiceLineRow> {
    let mut mock_invoice_lines: Vec<InvoiceLineRow> = Vec::new();

    mock_invoice_lines.extend(mock_customer_invoice_invoice_lines());
    mock_invoice_lines.extend(mock_supplier_invoice_invoice_lines());

    mock_invoice_lines
}
