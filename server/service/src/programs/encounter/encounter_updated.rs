use repository::{
    Document, EncounterFilter, EncounterRepository, EncounterRow, EncounterRowRepository,
    EncounterStatus, EqualFilter, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

use super::{encounter_schema, validate_misc::ValidatedSchemaEncounter};

/// Callback called when the document has been updated
pub(crate) fn update_encounter_row(
    con: &StorageConnection,
    patient_id: &str,
    document_context: &str,
    doc: &Document,
    validated_encounter: ValidatedSchemaEncounter,
    clinician_id: Option<String>,
) -> Result<(), RepositoryError> {
    let status = if let Some(status) = validated_encounter.encounter.status {
        Some(match status {
            encounter_schema::EncounterStatus::Pending => EncounterStatus::Pending,
            encounter_schema::EncounterStatus::Visited => EncounterStatus::Visited,
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
        document_type: doc.r#type.clone(),
        document_name: doc.name.clone(),
        patient_id: patient_id.to_string(),
        context: document_context.to_string(),
        created_datetime: validated_encounter.created_datetime,
        start_datetime: validated_encounter.start_datetime,
        end_datetime: validated_encounter.end_datetime,
        status,
        clinician_id,
        store_id: validated_encounter
            .encounter
            .location
            .and_then(|l| l.store_id),
    };
    EncounterRowRepository::new(con).upsert_one(&row)?;

    Ok(())
}
