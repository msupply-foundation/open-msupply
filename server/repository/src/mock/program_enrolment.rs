use crate::ProgramEnrolmentRow;

use super::{mock_patient, mock_program_a};

pub fn mock_program_enrolment_a() -> ProgramEnrolmentRow {
    ProgramEnrolmentRow {
        id: "program_enrolment_a".to_string(),
        program_id: mock_program_a().id,
        patient_link_id: mock_patient().id,
        ..Default::default()
    }
}

pub fn mock_program_enrolments() -> Vec<ProgramEnrolmentRow> {
    vec![mock_program_enrolment_a()]
}
