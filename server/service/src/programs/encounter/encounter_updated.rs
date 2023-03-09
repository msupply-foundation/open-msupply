use repository::{
    Document, EncounterFilter, EncounterRepository, EncounterRow, EncounterRowRepository,
    EncounterStatus, EqualFilter, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

use super::{
    encounter_schema::{self},
    validate_misc::ValidatedSchemaEncounter,
};

/// Callback called when the document has been updated
pub(crate) fn update_encounter_row(
    con: &StorageConnection,
    patient_id: &str,
    program: &str,
    doc: &Document,
    validated_encounter: ValidatedSchemaEncounter,
    clinician_id: Option<String>,
) -> Result<(), RepositoryError> {
    let status = if let Some(status) = validated_encounter.encounter.status {
        Some(match status {
            encounter_schema::EncounterStatus::Scheduled => EncounterStatus::Scheduled,
            encounter_schema::EncounterStatus::Completed => EncounterStatus::Completed,
            encounter_schema::EncounterStatus::Cancelled => EncounterStatus::Cancelled,
        })
    } else {
        None
    };

    let repo = EncounterRepository::new(con);
    let row = repo
        .query_by_filter(EncounterFilter::new().document_name(EqualFilter::equal_to(&doc.name)))?
        .pop();
    let id = match row {
        Some(row) => row.id,
        None => uuid(),
    };
    let row = EncounterRow {
        id,
        r#type: doc.r#type.clone(),
        document_name: doc.name.clone(),
        patient_id: patient_id.to_string(),
        program: program.to_string(),
        created_datetime: validated_encounter.created_datetime,
        start_datetime: validated_encounter.start_datetime,
        end_datetime: validated_encounter.end_datetime,
        status,
        clinician_id,
    };
    EncounterRowRepository::new(con).upsert_one(&row)?;

    Ok(())
}
