use crate::reason_option_row::{ReasonOptionRow, ReasonOptionType};

pub fn mock_reason_option() -> ReasonOptionRow {
    ReasonOptionRow {
        id: "option_id".to_string(),
        r#type: ReasonOptionType::ReturnReason,
        is_active: true,
        reason: "reason".to_string(),
    }
}

pub fn mock_requisition_variance_reason_option() -> ReasonOptionRow {
    ReasonOptionRow {
        id: "requisition_variance_option_id".to_string(),
        r#type: ReasonOptionType::RequisitionLineVariance,
        is_active: true,
        reason: "requisition variance reason".to_string(),
    }
}

pub fn mock_reason_options() -> Vec<ReasonOptionRow> {
    vec![
        mock_reason_option(),
        mock_requisition_variance_reason_option(),
    ]
}
