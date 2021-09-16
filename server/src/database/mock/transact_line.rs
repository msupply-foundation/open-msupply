use crate::database::schema::{TransactLineRow, TransactLineRowType};

pub fn mock_customer_invoice_a_transact_lines() -> Vec<TransactLineRow> {
    let mock_customer_invoice_a_transact_line_a: TransactLineRow = TransactLineRow {
        id: String::from("customer_invoice_a_line_a"),
        transact_id: String::from("customer_invoice_a"),
        item_id: String::from("item_a"),
        stock_line_id: Some(String::from("item_a_line_a")),
        type_of: TransactLineRowType::StockOut,
    };

    let mock_customer_invoice_a_transact_line_b: TransactLineRow = TransactLineRow {
        id: String::from("customer_invoice_a_line_b"),
        transact_id: String::from("customer_invoice_a"),
        item_id: String::from("item_b"),
        stock_line_id: Some(String::from("item_b_line_a")),
        type_of: TransactLineRowType::StockOut,
    };

    vec![
        mock_customer_invoice_a_transact_line_a,
        mock_customer_invoice_a_transact_line_b,
    ]
}

pub fn mock_customer_invoice_b_transact_lines() -> Vec<TransactLineRow> {
    let mock_customer_invoice_b_transact_line_a: TransactLineRow = TransactLineRow {
        id: String::from("customer_invoice_b_line_a"),
        transact_id: String::from("customer_invoice_b_"),
        item_id: String::from("item_a"),
        stock_line_id: Some(String::from("item_a_line_a")),
        type_of: TransactLineRowType::StockOut,
    };

    let mock_customer_invoice_b_transact_line_b: TransactLineRow = TransactLineRow {
        id: String::from("customer_invoice_b_line_b"),
        transact_id: String::from("customer_invoice_b"),
        item_id: String::from("item_b"),
        stock_line_id: Some(String::from("item_b_line_a")),
        type_of: TransactLineRowType::StockOut,
    };

    vec![
        mock_customer_invoice_b_transact_line_a,
        mock_customer_invoice_b_transact_line_b,
    ]
}

pub fn mock_supplier_invoice_a_transact_lines() -> Vec<TransactLineRow> {
    let mock_supplier_invoice_a_transact_line_a: TransactLineRow = TransactLineRow {
        id: String::from("supplier_invoice_a_line_a"),
        transact_id: String::from("supplier_invoice_a"),
        item_id: String::from("item_a"),
        stock_line_id: Some(String::from("item_a_line_a")),
        type_of: TransactLineRowType::StockIn,
    };

    let mock_supplier_invoice_a_transact_line_b: TransactLineRow = TransactLineRow {
        id: String::from("supplier_invoice_a_line_b"),
        transact_id: String::from("supplier_invoice_a"),
        item_id: String::from("item_b"),
        stock_line_id: Some(String::from("item_b_line_a")),
        type_of: TransactLineRowType::StockIn,
    };

    vec![
        mock_supplier_invoice_a_transact_line_a,
        mock_supplier_invoice_a_transact_line_b,
    ]
}

pub fn mock_supplier_invoice_b_transact_lines() -> Vec<TransactLineRow> {
    let mock_supplier_invoice_b_transact_line_a: TransactLineRow = TransactLineRow {
        id: String::from("supplier_invoice_b_line_a"),
        transact_id: String::from("supplier_invoice_b_"),
        item_id: String::from("item_a"),
        stock_line_id: Some(String::from("item_a_line_a")),
        type_of: TransactLineRowType::StockIn,
    };

    let mock_supplier_invoice_b_transact_line_b: TransactLineRow = TransactLineRow {
        id: String::from("supplier_invoice_b_line_b"),
        transact_id: String::from("supplier_invoice_b"),
        item_id: String::from("item_b"),
        stock_line_id: Some(String::from("item_b_line_a")),
        type_of: TransactLineRowType::StockIn,
    };

    vec![
        mock_supplier_invoice_b_transact_line_a,
        mock_supplier_invoice_b_transact_line_b,
    ]
}

pub fn mock_customer_invoice_transact_lines() -> Vec<TransactLineRow> {
    let mut mock_customer_invoice_transact_lines = Vec::new();

    mock_customer_invoice_transact_lines.extend(mock_customer_invoice_a_transact_lines());
    mock_customer_invoice_transact_lines.extend(mock_customer_invoice_b_transact_lines());

    mock_customer_invoice_transact_lines
}

pub fn mock_supplier_invoice_transact_lines() -> Vec<TransactLineRow> {
    let mut mock_supplier_invoice_transact_lines = Vec::new();

    mock_supplier_invoice_transact_lines.extend(mock_supplier_invoice_a_transact_lines());
    mock_supplier_invoice_transact_lines.extend(mock_supplier_invoice_b_transact_lines());

    mock_supplier_invoice_transact_lines
}

pub fn mock_transact_lines() -> Vec<TransactLineRow> {
    let mut mock_transact_lines: Vec<TransactLineRow> = Vec::new();

    mock_transact_lines.extend(mock_customer_invoice_transact_lines());
    mock_transact_lines.extend(mock_supplier_invoice_transact_lines());

    mock_transact_lines
}
