use chrono::DateTime;
use repository::{
    ProgramEnrolmentRepository, ProgramEnrolmentRow, ProgramEnrolmentRowRepository,
    StorageConnection,
};
use util::uuid::uuid;

use crate::document::raw_document::RawDocument;

use super::{program_schema::SchemaProgramEnrolment, UpsertProgramEnrolmentError};

/// Callback called when the document has been updated
pub(crate) fn program_enrolment_updated(
    con: &StorageConnection,
    patient_id: &str,
    document: &RawDocument,
    program: SchemaProgramEnrolment,
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
    let program_row = repo.find_one_by_type_and_patient(&document.r#type, patient_id)?;
    let id = match program_row {
        Some(program_row) => program_row.id,
        None => uuid(),
    };
    let program_row = ProgramEnrolmentRow {
        id,
        program: document.r#type.clone(),
        document_name: document.name.clone(),
        patient_id: patient_id.to_string(),
        enrolment_datetime,
        program_patient_id: program.enrolment_patient_id,
    };
    ProgramEnrolmentRowRepository::new(con).upsert_one(&program_row)?;

    Ok(program_row)
}
