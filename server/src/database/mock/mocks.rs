pub fn mock_requisition_lines() -> Vec<database::schema::RequisitionLineRow> {
    let requisition_line_a = database::schema::RequisitionLineRow {
        id: "requisition_a_line_a".to_string(),
        requisition_id: "requisition_a".to_string(),
        item_id: "item_a".to_string(),
        actual_quantity: 1.0,
        suggested_quantity: 1.0,
    };

    let requisition_line_b = database::schema::RequisitionLineRow {
        id: "requisition_a_line_b".to_string(),
        requisition_id: "requisition_a".to_string(),
        item_id: "item_b".to_string(),
        actual_quantity: 2.0,
        suggested_quantity: 2.0,
    };

    let requisition_line_c = database::schema::RequisitionLineRow {
        id: "requisition_b_line_a".to_string(),
        requisition_id: "requisition_b".to_string(),
        item_id: "item_a".to_string(),
        actual_quantity: 3.0,
        suggested_quantity: 3.0,
    };

    let requisition_line_d = database::schema::RequisitionLineRow {
        id: "requisition_b_line_b".to_string(),
        requisition_id: "requisition_b".to_string(),
        item_id: "item_b".to_string(),
        actual_quantity: 4.0,
        suggested_quantity: 4.0,
    };

    let requisition_line_e = database::schema::RequisitionLineRow {
        id: "requisition_c_line_a".to_string(),
        requisition_id: "requisition_c".to_string(),
        item_id: "item_a".to_string(),
        actual_quantity: 5.0,
        suggested_quantity: 5.0,
    };

    vec![
        requisition_line_a,
        requisition_line_b,
        requisition_line_c,
        requisition_line_d,
        requisition_line_e,
    ]
}

pub fn mock_invoices() -> Vec<database::schema::InvoiceRow> {
    let invoice_a = database::schema::InvoiceRow {
        id: "invoice_a".to_string(),
        name_id: "name_store_a".to_string(),
        store_id: "store_a".to_string(),
        invoice_number: 1,
        r#type: database::schema::InvoiceRowType::CustomerInvoice,
    };

    let invoice_b = database::schema::InvoiceRow {
        id: "invoice_b".to_string(),
        name_id: "name_store_b".to_string(),
        store_id: "store_b".to_string(),
        invoice_number: 1,
        r#type: database::schema::InvoiceRowType::CustomerInvoice,
    };

    vec![invoice_a, invoice_b]
}

pub fn mock_invoice_lines() -> Vec<database::schema::InvoiceLineRow> {
    let invoice_a_line_a = database::schema::InvoiceLineRow {
        id: "invoice_a_line_a".to_string(),
        invoice_id: "invoice_a".to_string(),
        r#type: crate::database::schema::InvoiceLineRowType::StockOut,
        item_id: "item_a".to_string(),
        stock_line_id: Some("item_a_line_a".to_string()),
    };

    let invoice_a_line_b = database::schema::InvoiceLineRow {
        id: "invoice_a_line_b".to_string(),
        invoice_id: "invoice_a".to_string(),
        r#type: database::schema::InvoiceLineRowType::StockOut,
        item_id: "item_b".to_string(),
        stock_line_id: Some("item_b_line_a".to_string()),
    };

    let invoice_b_line_a = database::schema::InvoiceLineRow {
        id: "invoice_b_line_a".to_string(),
        invoice_id: "invoice_b".to_string(),
        r#type: database::schema::InvoiceLineRowType::StockOut,
        item_id: "item_a".to_string(),
        stock_line_id: Some("item_a_line_a".to_string()),
    };

    let invoice_b_line_b = database::schema::InvoiceLineRow {
        id: "invoice_b_line_b".to_string(),
        invoice_id: "invoice_b".to_string(),
        r#type: database::schema::InvoiceLineRowType::StockOut,
        item_id: "item_b".to_string(),
        stock_line_id: Some("item_b_line_a".to_string()),
    };

    vec![
        invoice_a_line_a,
        invoice_a_line_b,
        invoice_b_line_a,
        invoice_b_line_b,
    ]
}
