
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

pub fn mock_transacts() -> Vec<database::schema::TransactRow> {
    let transact_a = database::schema::TransactRow {
        id: "transact_a".to_string(),
        name_id: "name_store_a".to_string(),
        store_id: "store_a".to_string(),
        invoice_number: 1,
        type_of: database::schema::TransactRowType::CustomerInvoice,
    };

    let transact_b = database::schema::TransactRow {
        id: "transact_b".to_string(),
        name_id: "name_store_b".to_string(),
        store_id: "store_b".to_string(),
        invoice_number: 1,
        type_of: database::schema::TransactRowType::CustomerInvoice,
    };

    vec![transact_a, transact_b]
}

pub fn mock_transact_lines() -> Vec<database::schema::TransactLineRow> {
    let transact_a_line_a = database::schema::TransactLineRow {
        id: "transact_a_line_a".to_string(),
        transact_id: "transact_a".to_string(),
        type_of: crate::database::schema::TransactLineRowType::StockOut,
        item_id: "item_a".to_string(),
        item_line_id: Some("item_a_line_a".to_string()),
    };

    let transact_a_line_b = database::schema::TransactLineRow {
        id: "transact_a_line_b".to_string(),
        transact_id: "transact_a".to_string(),
        type_of: database::schema::TransactLineRowType::StockOut,
        item_id: "item_b".to_string(),
        item_line_id: Some("item_b_line_a".to_string()),
    };

    let transact_b_line_a = database::schema::TransactLineRow {
        id: "transact_b_line_a".to_string(),
        transact_id: "transact_b".to_string(),
        type_of: database::schema::TransactLineRowType::StockOut,
        item_id: "item_a".to_string(),
        item_line_id: Some("item_a_line_a".to_string()),
    };

    let transact_b_line_b = database::schema::TransactLineRow {
        id: "transact_b_line_b".to_string(),
        transact_id: "transact_b".to_string(),
        type_of: database::schema::TransactLineRowType::StockOut,
        item_id: "item_b".to_string(),
        item_line_id: Some("item_b_line_a".to_string()),
    };

    vec![
        transact_a_line_a,
        transact_a_line_b,
        transact_b_line_a,
        transact_b_line_b,
    ]
}
