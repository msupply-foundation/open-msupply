use chrono::DateTime;
use repository::{
    Document, ProgramEnrolmentRepository, ProgramEnrolmentRow, ProgramEnrolmentRowRepository,
    ProgramRow, StorageConnection,
};
use util::hash::sha256;

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
    let program_enrolment = repo.find_one_by_program_id_and_patient(&program_row.id, patient_id)?;
    let id = match program_enrolment {
        Some(program_enrolment) => program_enrolment.row.id,
        None => sha256(&document.name),
    };

    // take latest status
    let status = program.status_log.clone().and_then(|mut log| {
        log.sort_by(|a, b| {
            let data_a = DateTime::parse_from_rfc3339(&a.datetime).ok();
            let data_b = DateTime::parse_from_rfc3339(&b.datetime).ok();
            data_a.cmp(&data_b)
        });
        log.pop().map(|it| it.status)
    });
    let program_row = ProgramEnrolmentRow {
        id,
        document_type: document.r#type.clone(),
        program_id: program_row.id,
        document_name: document.name.clone(),
        patient_link_id: patient_id.to_string(),
        enrolment_datetime,
        program_enrolment_id: program.program_enrolment_id,
        status,
    };
    ProgramEnrolmentRowRepository::new(con).upsert_one(&program_row)?;

    Ok(program_row)
}
