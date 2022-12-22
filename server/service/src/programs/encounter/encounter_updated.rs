use chrono::{DateTime, NaiveDateTime};
use repository::{
    EncounterFilter, EncounterRepository, EncounterRow, EncounterRowRepository, EncounterStatus,
    EqualFilter, RepositoryError,
};
use util::uuid::uuid;

use crate::{
    document::raw_document::RawDocument,
    programs::program_event::EventInput,
    service_provider::{ServiceContext, ServiceProvider},
};

use super::{
    encounter_schema::{self, EncounterEvent},
    validate_misc::ValidatedSchemaEncounter,
};

pub(crate) enum EncounterTableUpdateError {
    RepositoryError(RepositoryError),
    InternalError(String),
}

/// Callback called when the document has been updated
pub(crate) fn encounter_updated(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    patient_id: &str,
    program: &str,
    doc: &RawDocument,
    validated_encounter: ValidatedSchemaEncounter,
) -> Result<(), EncounterTableUpdateError> {
    let con = &ctx.connection;

    let status = if let Some(status) = validated_encounter.encounter.status {
        Some(match status {
            encounter_schema::EncounterStatus::Scheduled => EncounterStatus::Scheduled,
            encounter_schema::EncounterStatus::Done => EncounterStatus::Done,
            encounter_schema::EncounterStatus::Cancelled => EncounterStatus::Cancelled,
        })
    } else {
        None
    };

    if let Some(events) = validated_encounter.encounter.events {
        update_program_events(
            ctx,
            service_provider,
            patient_id,
            doc.timestamp.naive_utc(),
            events,
        )?;
    }

    let repo = EncounterRepository::new(con);
    let row = repo
        .query_by_filter(EncounterFilter::new().name(EqualFilter::equal_to(&doc.name)))
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
        start_datetime: validated_encounter.start_datetime,
        end_datetime: validated_encounter.end_datetime,
        status,
    };
    EncounterRowRepository::new(con)
        .upsert_one(&row)
        .map_err(|err| EncounterTableUpdateError::RepositoryError(err))?;

    Ok(())
}

fn update_program_events(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    patient_id: &str,
    event_date_time: NaiveDateTime,
    events: Vec<EncounterEvent>,
) -> Result<(), EncounterTableUpdateError> {
    let service = &service_provider.program_event_service;
    let event_inputs = events
        .into_iter()
        .map(|event| {
            let active_datetime = DateTime::parse_from_rfc3339(&event.active_datetime)
                .map_err(|err| {
                    EncounterTableUpdateError::InternalError(format!(
                        "Invalid encounter event datetime format: {}",
                        err
                    ))
                })?
                .naive_utc();
            Ok(EventInput {
                active_start_datetime: active_datetime,
                document_type: event.document_type,
                document_name: event.document_name,
                name: event.name,
                r#type: event.type_,
            })
        })
        .collect::<Result<Vec<EventInput>, EncounterTableUpdateError>>()?;
    service
        .upsert_events(ctx, patient_id.to_string(), event_date_time, event_inputs)
        .map_err(|err| EncounterTableUpdateError::RepositoryError(err))?;
    Ok(())
}
