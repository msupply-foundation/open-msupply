use crate::database::schema::{
    ItemLineRow, ItemRow, NameRow, RequisitionLineRow, RequisitionRow, RequisitionRowType, StoreRow,
};

pub fn mock_stores() -> Vec<StoreRow> {
    let store_a = StoreRow {
        id: "store_a".to_string(),
        name_id: "name_store_a".to_string(),
    };

    let store_b = StoreRow {
        id: "store_b".to_string(),
        name_id: "name_store_b".to_string(),
    };

    let store_c = StoreRow {
        id: "store_c".to_string(),
        name_id: "name_store_c".to_string(),
    };

    vec![store_a, store_b, store_c]
}

pub fn mock_names() -> Vec<NameRow> {
    let name_a = NameRow {
        id: "name_store_a".to_string(),
        name: "Store A".to_string(),
    };

    let name_b = NameRow {
        id: "name_store_b".to_string(),
        name: "Store B".to_string(),
    };

    let name_c = NameRow {
        id: "name_store_c".to_string(),
        name: "Store C".to_string(),
    };

    vec![name_a, name_b, name_c]
}

pub fn mock_items() -> Vec<ItemRow> {
    let item_a = ItemRow {
        id: "item_a".to_string(),
        item_name: "Item A".to_string(),
    };

    let item_b = ItemRow {
        id: "item_b".to_string(),
        item_name: "Item B".to_string(),
    };

    let item_c = ItemRow {
        id: "item_c".to_string(),
        item_name: "Item C".to_string(),
    };

    vec![item_a, item_b, item_c]
}

pub fn mock_item_lines() -> Vec<ItemLineRow> {
    let item_line_a = ItemLineRow {
        id: "item_a_line_a".to_string(),
        item_id: "item_a".to_string(),
        store_id: "store_a".to_string(),
        batch: "item_a_batch_a".to_string(),
        quantity: 1.0,
    };

    let item_line_b = ItemLineRow {
        id: "item_a_line_b".to_string(),
        item_id: "item_a".to_string(),
        store_id: "store_a".to_string(),
        batch: "item_a_batch_b".to_string(),
        quantity: 2.0,
    };

    let item_line_c = ItemLineRow {
        id: "item_b_line_a".to_string(),
        item_id: "item_b".to_string(),
        store_id: "store_a".to_string(),
        batch: "item_b_batch_a".to_string(),
        quantity: 3.0,
    };

    let item_line_d = ItemLineRow {
        id: "item_b_line_b".to_string(),
        item_id: "item_b".to_string(),
        store_id: "store_a".to_string(),
        batch: "item_b_batch_b".to_string(),
        quantity: 4.0,
    };

    let item_line_e = ItemLineRow {
        id: "item_c_line_a".to_string(),
        item_id: "item_c".to_string(),
        store_id: "store_a".to_string(),
        batch: "item_c_batch_a".to_string(),
        quantity: 5.0,
    };

    let item_line_f = ItemLineRow {
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

pub fn mock_requisitions() -> Vec<RequisitionRow> {
    let requisition_a = RequisitionRow {
        id: "requisition_a".to_string(),
        name_id: "name_store_a".to_string(),
        store_id: "store_b".to_string(),
        type_of: RequisitionRowType::Request,
    };

    let requisition_b = RequisitionRow {
        id: "requisition_b".to_string(),
        name_id: "name_store_b".to_string(),
        store_id: "store_a".to_string(),
        type_of: RequisitionRowType::Response,
    };

    let requisition_c = RequisitionRow {
        id: "requisition_c".to_string(),
        name_id: "name_store_a".to_string(),
        store_id: "store_c".to_string(),
        type_of: RequisitionRowType::Request,
    };

    let requisition_d = RequisitionRow {
        id: "requisition_d".to_string(),
        name_id: "name_store_c".to_string(),
        store_id: "store_a".to_string(),
        type_of: RequisitionRowType::Response,
    };

    let requisition_e = RequisitionRow {
        id: "requisition_e".to_string(),
        name_id: "name_store_b".to_string(),
        store_id: "store_c".to_string(),
        type_of: RequisitionRowType::Request,
    };

    let requisition_f = RequisitionRow {
        id: "requisition_f".to_string(),
        name_id: "name_store_c".to_string(),
        store_id: "store_b".to_string(),
        type_of: RequisitionRowType::Response,
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

pub fn mock_requisition_lines() -> Vec<RequisitionLineRow> {
    let requisition_line_a = RequisitionLineRow {
        id: "requisition_a_line_a".to_string(),
        requisition_id: "requisition_a".to_string(),
        item_id: "item_a".to_string(),
        actual_quantity: 1.0,
        suggested_quantity: 1.0,
    };

    let requisition_line_b = RequisitionLineRow {
        id: "requisition_a_line_b".to_string(),
        requisition_id: "requisition_a".to_string(),
        item_id: "item_b".to_string(),
        actual_quantity: 2.0,
        suggested_quantity: 2.0,
    };

    let requisition_line_c = RequisitionLineRow {
        id: "requisition_b_line_a".to_string(),
        requisition_id: "requisition_b".to_string(),
        item_id: "item_a".to_string(),
        actual_quantity: 3.0,
        suggested_quantity: 3.0,
    };

    let requisition_line_d = RequisitionLineRow {
        id: "requisition_b_line_b".to_string(),
        requisition_id: "requisition_b".to_string(),
        item_id: "item_b".to_string(),
        actual_quantity: 4.0,
        suggested_quantity: 4.0,
    };

    let requisition_line_e = RequisitionLineRow {
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
