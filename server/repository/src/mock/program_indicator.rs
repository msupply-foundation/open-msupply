use crate::ProgramIndicatorRow;

use super::{mock_program_a, mock_program_b};

pub fn mock_program_indicator_a() -> ProgramIndicatorRow {
    ProgramIndicatorRow {
        id: "program_indicator_a".to_string(),
        program_id: mock_program_a().id,
        code: Some("program indicator a".to_string()),
        is_active: true,
    }
}
pub fn mock_program_indicator_b() -> ProgramIndicatorRow {
    ProgramIndicatorRow {
        id: "program_indicator_b".to_string(),
        program_id: mock_program_a().id,
        code: None,
        is_active: true,
    }
}
pub fn mock_program_indicator_c() -> ProgramIndicatorRow {
    ProgramIndicatorRow {
        id: "program_indicator_c".to_string(),
        program_id: mock_program_b().id,
        code: Some("program indicator c".to_string()),
        is_active: false,
    }
}

pub fn mock_program_indicators() -> Vec<ProgramIndicatorRow> {
    vec![
        mock_program_indicator_a(),
        mock_program_indicator_b(),
        mock_program_indicator_c(),
    ]
}
