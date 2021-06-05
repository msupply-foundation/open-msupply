//! src/utils/mocks/requisition_line.rs

use crate::utils::database::schema::RequisitionLineRow;

pub fn generate_requisition_line_data() -> Vec<RequisitionLineRow> {
    let requisition_line_a = RequisitionLineRow {
        id: "requisition_line_a".to_string(),
        requisition_id: "requisition_a".to_string(),
        item_name: "item_a".to_string(),
        item_quantity: 1.0,
    };

    let requisition_line_b = RequisitionLineRow {
        id: "requisition_line_b".to_string(),
        requisition_id: "requisition_a".to_string(),
        item_name: "item_b".to_string(),
        item_quantity: 2.0,
    };

    let requisition_line_c = RequisitionLineRow {
        id: "requisition_line_c".to_string(),
        requisition_id: "requisition_b".to_string(),
        item_name: "item_a".to_string(),
        item_quantity: 3.0,
    };

    let requisition_line_d = RequisitionLineRow {
        id: "requisition_line_d".to_string(),
        requisition_id: "requisition_b".to_string(),
        item_name: "item_b".to_string(),
        item_quantity: 4.0,
    };

    let requisition_line_e = RequisitionLineRow {
        id: "requisition_line_e".to_string(),
        requisition_id: "requisition_c".to_string(),
        item_name: "item_a".to_string(),
        item_quantity: 5.0,
    };

    vec![
        requisition_line_a,
        requisition_line_b,
        requisition_line_c,
        requisition_line_d,
        requisition_line_e,
    ]
}
