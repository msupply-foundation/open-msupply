use chrono::DateTime;
use repository::{
    Document, ProgramEnrolmentRepository, ProgramEnrolmentRow, ProgramEnrolmentRowRepository,
    ProgramEnrolmentStatus, ProgramRow, StorageConnection,
};
use util::uuid::uuid;

use super::{program_schema::SchemaProgramEnrolment, UpsertProgramEnrolmentError};

/// Callback called when a program enrolment document has been updated
pub(crate) fn update_program_enrolment_row(
    con: &StorageConnection,
    patient_id: &str,
    document: &Document,
    program: SchemaProgramEnrolment,
    program_row: ProgramRow,
) -> Result<ProgramEnrolmentRow, UpsertProgramEnrolmentError> {
    let enrolment_datetime = DateTime::parse_from_rfc3339(&program.enrolment_datetime)
        .map_err(|err| {
            UpsertProgramEnrolmentError::InternalError(format!(
                "Invalid enrolment datetime format: {}",
                err
            ))
        })?
        .naive_utc();

    let repo = ProgramEnrolmentRepository::new(con);
    let program_enrolment_row =
        repo.find_one_by_program_id_and_patient(&program_row.id, patient_id)?;
    let id = match program_enrolment_row {
        Some(program_enrolment_row) => program_enrolment_row.0.id,
        None => uuid(),
    };

    let status = match program.status {
        super::program_schema::ProgramEnrolmentStatus::Active => ProgramEnrolmentStatus::Active,
        super::program_schema::ProgramEnrolmentStatus::OptedOut => ProgramEnrolmentStatus::OptedOut,
        super::program_schema::ProgramEnrolmentStatus::TransferredOut => {
            ProgramEnrolmentStatus::TransferredOut
        }
        super::program_schema::ProgramEnrolmentStatus::Paused => ProgramEnrolmentStatus::Paused,
    };

    let program_row = ProgramEnrolmentRow {
        id,
        document_type: document.r#type.clone(),
        program_id: program_row.id,
        document_name: document.name.clone(),
        patient_id: patient_id.to_string(),
        enrolment_datetime,
        program_enrolment_id: program.program_enrolment_id,
        status,
    };
    ProgramEnrolmentRowRepository::new(con).upsert_one(&program_row)?;

    Ok(program_row)
}
