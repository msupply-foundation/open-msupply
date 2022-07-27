use chrono::DateTime;
use repository::{
    EncounterFilter, EncounterRepository, EncounterRow, EncounterRowRepository, EncounterStatus,
    EqualFilter, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

use super::encounter_schema::SchemaEncounter;

pub(crate) enum EncounterTableUpdateError {
    RepositoryError(RepositoryError),
    InternalError(String),
}

/// Callback called when the document has been updated
pub(crate) fn encounter_updated(
    con: &StorageConnection,
    patient_id: &str,
    program: &str,
    doc_name: &str,
    encounter: SchemaEncounter,
) -> Result<EncounterRow, EncounterTableUpdateError> {
    let encounter_datetime = DateTime::parse_from_rfc3339(&encounter.encounter_datetime)
        .map_err(|err| {
            EncounterTableUpdateError::InternalError(format!(
                "Invalid encounter datetime format: {}",
                err
            ))
        })?
        .naive_utc();
    let status = match encounter.status.as_str() {
        "Scheduled" => EncounterStatus::Scheduled,
        "Ongoing" => EncounterStatus::Ongoing,
        "Finished" => EncounterStatus::Finished,
        "Canceled" => EncounterStatus::Canceled,
        "Missed" => EncounterStatus::Missed,
        value => {
            // This assumes that the enum values are validated correctly previously and we are
            // suppose to only receive known enum values
            return Err(EncounterTableUpdateError::InternalError(format!(
                "Can't handle encounter enum value: {}",
                value
            )));
        }
    };

    let repo = EncounterRepository::new(con);
    let row = repo
        .query_by_filter(
            EncounterFilter::new()
                .patient_id(EqualFilter::equal_to(patient_id))
                .program(EqualFilter::equal_to(program)),
        )
        .map_err(|err| EncounterTableUpdateError::RepositoryError(err))?
        .pop();
    let id = match row {
        Some(row) => row.id,
        None => uuid(),
    };
    let row = EncounterRow {
        id,
        patient_id: patient_id.to_string(),
        program: program.to_string(),
        name: doc_name.to_string(),
        encounter_datetime: encounter_datetime,
        status,
    };
    EncounterRowRepository::new(con)
        .upsert_one(&row)
        .map_err(|err| EncounterTableUpdateError::RepositoryError(err))?;

    Ok(row)
}
