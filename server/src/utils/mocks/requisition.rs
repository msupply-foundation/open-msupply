//! src/utils/mocks/requisition.rs

use crate::utils::database::schema::RequisitionRow;

pub fn generate_requisition_data() -> Vec<RequisitionRow> {
    let requisition_a = RequisitionRow {
        id: "requisition_a".to_string(),
        from_id: "store_a".to_string(),
        to_id: "store_b".to_string(),
    };

    let requisition_b = RequisitionRow {
        id: "requisition_b".to_string(),
        from_id: "store_a".to_string(),
        to_id: "store_c".to_string(),
    };

    let requisition_c = RequisitionRow {
        id: "requisition_c".to_string(),
        from_id: "store_b".to_string(),
        to_id: "store_c".to_string(),
    };

    vec![requisition_a, requisition_b, requisition_c]
}
