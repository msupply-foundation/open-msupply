use crate::ProgramRow;

use super::{
    context_immunisation_program, context_program_a, context_program_b, mock_master_list_program,
    mock_master_list_program_b,
};

pub fn mock_program_a() -> ProgramRow {
    ProgramRow {
        id: "program_a".to_string(),
        master_list_id: Some(mock_master_list_program().master_list.id),
        name: "program_a".to_string(),
        context_id: context_program_a().id,
        is_immunisation: false,
        deleted_datetime: None,
    }
}
pub fn mock_program_b() -> ProgramRow {
    ProgramRow {
        id: "program_b".to_string(),
        master_list_id: Some(mock_master_list_program_b().master_list.id),
        name: "program_b".to_string(),
        context_id: context_program_b().id,
        is_immunisation: false,
        deleted_datetime: None,
    }
}

pub fn mock_immunisation_program_a() -> ProgramRow {
    ProgramRow {
        id: "immunisation_program".to_string(),
        master_list_id: None,
        name: "immunisation_program".to_string(),
        context_id: context_immunisation_program().id,
        is_immunisation: true,
        deleted_datetime: None,
    }
}

pub fn mock_immunisation_program_b() -> ProgramRow {
    ProgramRow {
        id: "immunisation_program_b".to_string(),
        master_list_id: None,
        name: "immunisation_program_b".to_string(),
        context_id: context_immunisation_program().id,
        is_immunisation: true,
        deleted_datetime: None,
    }
}

pub fn mock_programs() -> Vec<ProgramRow> {
    vec![
        mock_program_a(),
        mock_program_b(),
        mock_immunisation_program_a(),
        mock_immunisation_program_b(),
    ]
}
