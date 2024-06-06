use crate::ProgramRow;

use super::mock_master_list_program;

pub fn mock_program_a() -> ProgramRow {
    ProgramRow {
        id: "program_a".to_string(),
        master_list_id: Some(mock_master_list_program().master_list.id),
        name: "program_a".to_string(),
        context_id: "program_a".to_string(),
        is_immunisation: false,
    }
}

pub fn mock_immunisation_program() -> ProgramRow {
    ProgramRow {
        id: "immunisation_program".to_string(),
        master_list_id: None,
        name: "immunisation_program".to_string(),
        context_id: "immunisation_program".to_string(),
        is_immunisation: true,
    }
}

pub fn mock_programs() -> Vec<ProgramRow> {
    vec![mock_program_a(), mock_immunisation_program()]
}
