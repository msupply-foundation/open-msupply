use std::collections::HashMap;

use chrono::DateTime;
use repository::{
    EncounterFilter, EncounterRepository, EncounterRow, EncounterRowRepository, EncounterStatus,
    EqualFilter, RepositoryError,
};
use util::uuid::uuid;

use crate::{
    document::raw_document::RawDocument,
    programs::program_event::ReplaceEventInput,
    service_provider::{ServiceContext, ServiceProvider},
};

use super::encounter_schema::{self, EncounterEvent, SchemaEncounter};

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
    encounter: SchemaEncounter,
) -> Result<(), EncounterTableUpdateError> {
    let con = &ctx.connection;

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
            encounter_schema::EncounterStatus::Cancelled => EncounterStatus::Cancelled,
        })
    } else {
        None
    };

    if let Some(events) = encounter.events {
        update_program_events(ctx, service_provider, patient_id, program, events)?;
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
        start_datetime,
        end_datetime,
        status,
    };
    EncounterRowRepository::new(con)
        .upsert_one(&row)
        .map_err(|err| EncounterTableUpdateError::RepositoryError(err))?;

    Ok(())
}

fn replace_context_events(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    patient_id: &str,
    context: &str,
    events: Vec<EncounterEvent>,
) -> Result<(), EncounterTableUpdateError> {
    let mut grouped_events: HashMap<String, Vec<EncounterEvent>> = HashMap::new();
    for event in events {
        grouped_events
            .entry(event.group.clone().unwrap_or("".to_string()))
            .or_insert(vec![])
            .push(event);
    }

    let service = &service_provider.program_event_service;
    for (group, events) in grouped_events {
        let replace_events = events
            .into_iter()
            .map(|event| {
                let datetime = DateTime::parse_from_rfc3339(&event.datetime)
                    .map_err(|err| {
                        EncounterTableUpdateError::InternalError(format!(
                            "Invalid encounter event datetime format: {}",
                            err
                        ))
                    })?
                    .naive_utc();
                Ok(ReplaceEventInput {
                    datetime: datetime,
                    r#type: event.type_,
                    name: event.name,
                })
            })
            .collect::<Result<Vec<ReplaceEventInput>, EncounterTableUpdateError>>()?;
        service
            .replace_event_group(
                ctx,
                Some(patient_id.to_string()),
                &context,
                &group,
                replace_events,
            )
            .map_err(|err| EncounterTableUpdateError::RepositoryError(err))?;
    }
    Ok(())
}

fn update_program_events(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    patient_id: &str,
    program: &str,
    events: Vec<EncounterEvent>,
) -> Result<(), EncounterTableUpdateError> {
    let mut context_events: HashMap<String, Vec<EncounterEvent>> = HashMap::new();
    for event in events {
        context_events
            .entry(event.context.clone().unwrap_or(program.to_string()))
            .or_insert(vec![])
            .push(event);
    }

    for (context, ctx_events) in context_events {
        replace_context_events(ctx, service_provider, patient_id, &context, ctx_events)?;
    }
    Ok(())
}
