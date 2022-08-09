use chrono::DateTime;
use repository::{
    EncounterFilter, EncounterRepository, EncounterRow, EncounterRowRepository, EncounterStatus,
    EqualFilter, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

use crate::document::raw_document::RawDocument;

use super::encounter_schema::{self, SchemaEncounter};

pub(crate) enum EncounterTableUpdateError {
    RepositoryError(RepositoryError),
    InternalError(String),
}

/// Callback called when the document has been updated
pub(crate) fn encounter_updated(
    con: &StorageConnection,
    patient_id: &str,
    program: &str,
    doc: &RawDocument,
    encounter: SchemaEncounter,
) -> Result<EncounterRow, EncounterTableUpdateError> {
    let start_datetime = DateTime::parse_from_rfc3339(&encounter.start_datetime)
        .map_err(|err| {
            EncounterTableUpdateError::InternalError(format!(
                "Invalid encounter datetime format: {}",
                err
            ))
        })?
        .naive_utc();
    let end_datetime = if let Some(end_datetime) = encounter.end_datetime {
        Some(
            DateTime::parse_from_rfc3339(&end_datetime)
                .map_err(|err| {
                    EncounterTableUpdateError::InternalError(format!(
                        "Invalid encounter datetime format: {}",
                        err
                    ))
                })?
                .naive_utc(),
        )
    } else {
        None
    };
    let status = if let Some(status) = encounter.status {
        Some(match status {
            encounter_schema::EncounterStatus::Scheduled => EncounterStatus::Scheduled,
            encounter_schema::EncounterStatus::Done => EncounterStatus::Done,
            encounter_schema::EncounterStatus::Canceled => EncounterStatus::Canceled,
        })
    } else {
        None
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
        r#type: doc.r#type.clone(),
        name: doc.name.clone(),
        patient_id: patient_id.to_string(),
        program: program.to_string(),
        start_datetime,
        end_datetime,
        status,
    };
    EncounterRowRepository::new(con)
        .upsert_one(&row)
        .map_err(|err| EncounterTableUpdateError::RepositoryError(err))?;

    Ok(row)
}
