use chrono::DateTime;
use repository::{
    Document, ProgramRepository, ProgramRow, ProgramRowRepository, StorageConnection,
};
use util::uuid::uuid;

use super::{program_schema::SchemaProgramEnrolment, UpsertProgramError};

/// Callback called when the document has been updated
pub(crate) fn program_updated(
    con: &StorageConnection,
    patient_id: &str,
    document: &Document,
    program: SchemaProgramEnrolment,
) -> Result<ProgramRow, UpsertProgramError> {
    let enrolment_datetime = DateTime::parse_from_rfc3339(&program.enrolment_datetime)
        .map_err(|err| {
            UpsertProgramError::InternalError(format!("Invalid enrolment datetime format: {}", err))
        })?
        .naive_utc();

    let repo = ProgramRepository::new(con);
    let program_row = repo.find_one_by_type_and_patient(&document.r#type, patient_id)?;
    let id = match program_row {
        Some(program_row) => program_row.id,
        None => uuid(),
    };
    let program_row = ProgramRow {
        id,
        r#type: document.r#type.clone(),
        name: document.name.clone(),
        patient_id: patient_id.to_string(),
        enrolment_datetime: enrolment_datetime,
        program_patient_id: program.enrolment_patient_id,
    };
    ProgramRowRepository::new(con).upsert_one(&program_row)?;

    Ok(program_row)
}
