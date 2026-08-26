use crate::ProgramRequisitionSettingsRow;

use super::{
    mock_name_tag_1, mock_period_schedule_1, mock_period_schedule_2, mock_program_a, mock_program_b,
};

pub fn mock_program_requisition_setting_a() -> ProgramRequisitionSettingsRow {
    ProgramRequisitionSettingsRow {
        id: "program_requisition_setting_a".to_string(),
        name_tag_id: mock_name_tag_1().id,
        program_id: mock_program_a().id,
        period_schedule_id: mock_period_schedule_1().id,
    }
}
pub fn mock_program_requisition_setting_b() -> ProgramRequisitionSettingsRow {
    ProgramRequisitionSettingsRow {
        id: "program_requisition_setting_b".to_string(),
        name_tag_id: mock_name_tag_1().id,
        program_id: mock_program_b().id,
        period_schedule_id: mock_period_schedule_2().id,
    }
}

pub fn mock_program_requisition_settings() -> Vec<ProgramRequisitionSettingsRow> {
    vec![
        mock_program_requisition_setting_a(),
        mock_program_requisition_setting_b(),
    ]
}
