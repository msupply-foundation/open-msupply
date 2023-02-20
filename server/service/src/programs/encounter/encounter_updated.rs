use repository::{
    ClinicianRow, EncounterFilter, EncounterRepository, EncounterRow, EncounterRowRepository,
    EncounterStatus, EqualFilter, RepositoryError,
};
use util::uuid::uuid;

use crate::{document::raw_document::RawDocument, service_provider::ServiceContext};

use super::{
    encounter_schema::{self},
    validate_misc::ValidatedSchemaEncounter,
};

/// Callback called when the document has been updated
pub(crate) fn update_encounter_row(
    ctx: &ServiceContext,
    patient_id: &str,
    program: &str,
    doc: &RawDocument,
    validated_encounter: ValidatedSchemaEncounter,
    clinician_row: Option<ClinicianRow>,
) -> Result<(), RepositoryError> {
    let con = &ctx.connection;

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
        clinician_id: clinician_row.map(|c| c.id),
    };
    EncounterRowRepository::new(con).upsert_one(&row)?;

    Ok(())
}
