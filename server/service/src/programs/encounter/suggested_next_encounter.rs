use chrono::{DateTime, NaiveDateTime};
use repository::{
    EqualFilter, NextEncounterEnum, PaginationOption, ProgramEventFilter, RepositoryError,
};

use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    ListError,
};

pub struct SuggestedNextEncounter {
    pub start_datetime: NaiveDateTime,
    pub label: Option<String>,
}

pub fn suggested_next_encounter(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    patient_id: &str,
    encounter_type: &str,
    allowed_ctx: &[String],
) -> Result<Option<SuggestedNextEncounter>, RepositoryError> {
    let Some(config) = service_provider
        .document_registry_service
        .get_entries_by_doc_type(
            &ctx.connection,
            vec![encounter_type.to_string()],
            Some(allowed_ctx),
        )?
        .pop()
        .and_then(|it| it.config)
    else {
        return Ok(None);
    };
    let Some(NextEncounterEnum::Event(config)) = config.next_encounter else {
        return Ok(None);
    };
    let program_filter = ProgramEventFilter::new()
        .patient_id(EqualFilter::equal_to(patient_id))
        .document_type(EqualFilter::equal_to(encounter_type))
        .r#type(EqualFilter::equal_to(&config.event_type));
    let Some(program_event) = service_provider
        .program_event_service
        .events(
            ctx,
            Some(PaginationOption {
                limit: Some(1),
                offset: Some(0),
            }),
            Some(program_filter),
            None,
            Some(allowed_ctx),
        )
        .map_err(|err| match err {
            ListError::DatabaseError(err) => err,
            ListError::LimitBelowMin(_) => RepositoryError::as_db_error("Not possible", ()),
            ListError::LimitAboveMax(_) => RepositoryError::as_db_error("Not possible", ()),
        })?
        .rows
        .pop()
    else {
        return Ok(None);
    };

    let Some(Ok(start_datetime)) = program_event
        .program_event_row
        .data
        .map(|date_string| DateTime::parse_from_rfc3339(&date_string))
    else {
        return Ok(None);
    };
    Ok(Some(SuggestedNextEncounter {
        start_datetime: start_datetime.naive_utc(),
        label: config.label,
    }))
}
