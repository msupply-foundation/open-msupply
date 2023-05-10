use crate::ProgramRequisitionOrderTypeRow;

use super::mock_program_requisition_setting_a;

pub fn mock_program_order_types_a() -> ProgramRequisitionOrderTypeRow {
    ProgramRequisitionOrderTypeRow {
        id: "program_requisition_order_a".to_string(),
        program_requisition_settings_id: mock_program_requisition_setting_a().id,
        name: "program_requisition_order_a".to_string(),
        threshold_mos: 2.0,
        max_mos: 4.0,
        max_order_per_period: 1,
    }
}

pub fn mock_program_order_types() -> Vec<ProgramRequisitionOrderTypeRow> {
    vec![mock_program_order_types_a()]
}
