use crate::ProgramRow;

use super::mock_master_list_program;

pub fn mock_program_a() -> ProgramRow {
    ProgramRow {
        id: "program_a".to_string(),
        master_list_id: mock_master_list_program().master_list.id,
        name: "program_a".to_string(),
    }
}

pub fn mock_programs() -> Vec<ProgramRow> {
    vec![mock_program_a()]
}
