use crate::database;

pub fn mock_stores() -> Vec<database::schema::StoreRow> {
    let store_a = database::schema::StoreRow {
        id: "store_a".to_string(),
        name_id: "name_store_a".to_string(),
    };

    let store_b = database::schema::StoreRow {
        id: "store_b".to_string(),
        name_id: "name_store_b".to_string(),
    };

    let store_c = database::schema::StoreRow {
        id: "store_c".to_string(),
        name_id: "name_store_c".to_string(),
    };

    vec![store_a, store_b, store_c]
}

pub fn mock_names() -> Vec<database::schema::NameRow> {
    let name_a = database::schema::NameRow {
        id: "name_store_a".to_string(),
        name: "Store A".to_string(),
    };

    let name_b = database::schema::NameRow {
        id: "name_store_b".to_string(),
        name: "Store B".to_string(),
    };

    let name_c = database::schema::NameRow {
        id: "name_store_c".to_string(),
        name: "Store C".to_string(),
    };

    vec![name_a, name_b, name_c]
}

pub fn mock_items() -> Vec<database::schema::ItemRow> {
    let item_a = database::schema::ItemRow {
        id: "item_a".to_string(),
        item_name: "Item A".to_string(),
        type_of: database::schema::ItemRowType::General,
    };

    let item_b = database::schema::ItemRow {
        id: "item_b".to_string(),
        item_name: "Item B".to_string(),
        type_of: database::schema::ItemRowType::General,
    };

    let item_c = database::schema::ItemRow {
        id: "item_c".to_string(),
        item_name: "Item C".to_string(),
        type_of: database::schema::ItemRowType::General,
    };

    vec![item_a, item_b, item_c]
}

pub fn mock_item_lines() -> Vec<database::schema::ItemLineRow> {
    let item_line_a = database::schema::ItemLineRow {
        id: "item_a_line_a".to_string(),
        item_id: "item_a".to_string(),
        store_id: "store_a".to_string(),
        batch: "item_a_batch_a".to_string(),
        quantity: 1.0,
    };

    let item_line_b = database::schema::ItemLineRow {
        id: "item_a_line_b".to_string(),
        item_id: "item_a".to_string(),
        store_id: "store_a".to_string(),
        batch: "item_a_batch_b".to_string(),
        quantity: 2.0,
    };

    let item_line_c = database::schema::ItemLineRow {
        id: "item_b_line_a".to_string(),
        item_id: "item_b".to_string(),
        store_id: "store_a".to_string(),
        batch: "item_b_batch_a".to_string(),
        quantity: 3.0,
    };

    let item_line_d = database::schema::ItemLineRow {
        id: "item_b_line_b".to_string(),
        item_id: "item_b".to_string(),
        store_id: "store_a".to_string(),
        batch: "item_b_batch_b".to_string(),
        quantity: 4.0,
    };

    let item_line_e = database::schema::ItemLineRow {
        id: "item_c_line_a".to_string(),
        item_id: "item_c".to_string(),
        store_id: "store_a".to_string(),
        batch: "item_c_batch_a".to_string(),
        quantity: 5.0,
    };

    let item_line_f = database::schema::ItemLineRow {
        id: "item_c_line_b".to_string(),
        item_id: "item_c".to_string(),
        store_id: "store_a".to_string(),
        batch: "item_c_batch_b".to_string(),
        quantity: 6.0,
    };

    vec![
        item_line_a,
        item_line_b,
        item_line_c,
        item_line_d,
        item_line_e,
        item_line_f,
    ]
}

pub fn mock_requisitions() -> Vec<database::schema::RequisitionRow> {
    let requisition_a = database::schema::RequisitionRow {
        id: "requisition_a".to_string(),
        name_id: "name_store_a".to_string(),
        store_id: "store_b".to_string(),
        type_of: database::schema::RequisitionRowType::Request,
    };

    let requisition_b = database::schema::RequisitionRow {
        id: "requisition_b".to_string(),
        name_id: "name_store_b".to_string(),
        store_id: "store_a".to_string(),
        type_of: database::schema::RequisitionRowType::Response,
    };

    let requisition_c = database::schema::RequisitionRow {
        id: "requisition_c".to_string(),
        name_id: "name_store_a".to_string(),
        store_id: "store_c".to_string(),
        type_of: database::schema::RequisitionRowType::Request,
    };

    let requisition_d = database::schema::RequisitionRow {
        id: "requisition_d".to_string(),
        name_id: "name_store_c".to_string(),
        store_id: "store_a".to_string(),
        type_of: database::schema::RequisitionRowType::Response,
    };

    let requisition_e = database::schema::RequisitionRow {
        id: "requisition_e".to_string(),
        name_id: "name_store_b".to_string(),
        store_id: "store_c".to_string(),
        type_of: database::schema::RequisitionRowType::Request,
    };

    let requisition_f = database::schema::RequisitionRow {
        id: "requisition_f".to_string(),
        name_id: "name_store_c".to_string(),
        store_id: "store_b".to_string(),
        type_of: database::schema::RequisitionRowType::Response,
    };

    vec![
        requisition_a,
        requisition_b,
        requisition_c,
        requisition_d,
        requisition_e,
        requisition_f,
    ]
}

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
