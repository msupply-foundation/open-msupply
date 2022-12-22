use chrono::{DateTime, Duration, NaiveDateTime, Utc};
use repository::{Document, RepositoryError, TransactionError};
use serde_json::{Map, Value};

use crate::{
    document::{document_service::DocumentInsertError, raw_document::RawDocument},
    service_provider::{ServiceContext, ServiceProvider},
};

use super::{
    program_event::EventInput,
    program_event_config::{deserialize_config, Condition, Config, Target},
};

pub enum UpdateProgramDocumentError {
    NotAllowedToMutateDocument,
    InvalidDataSchema(Vec<String>),
    DatabaseError(RepositoryError),
    InternalError(String),
    DataSchemaDoesNotExist,
    InvalidParentId,
}

fn extract_events(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    base_time: NaiveDateTime,
    doc: &RawDocument,
    allowed_docs: &Vec<String>,
) -> Result<Vec<EventInput>, UpdateProgramDocumentError> {
    let Some(registry_entries) = service_provider
        .document_registry_service
        .get_entries_by_doc_type(ctx, vec![doc.r#type.clone()], allowed_docs)?
        .pop() else { return Ok(vec![])};

    let Some(ui_schema) = registry_entries.ui_schema.as_object() else {
        return Ok(vec![])
    };
    let Some(config_list) = deserialize_config(ui_schema)
        .map_err(|err| UpdateProgramDocumentError::InternalError(format!("Failed to deserialize event config: {:?}", err)))? else {
            return Ok(vec![]);
        };

    let mut output = vec![];
    for config in config_list {
        match config {
            Config::Schedule(schedule_config) => {
                if !match_all_conditions(schedule_config.conditions, doc) {
                    continue;
                }

                let start_datetime = if schedule_config.config.schedule_from_now.unwrap_or(false) {
                    Utc::now().naive_utc()
                } else {
                    schedule_config
                        .config
                        .datetime_field
                        .map(|field| extract_naivedatetime_field(&doc.data, &field))
                        .flatten()
                        .unwrap_or(base_time)
                };
                let mut active_start_datetime = start_datetime;

                if let Some(days) = schedule_config.config.schedule_in.days {
                    active_start_datetime = start_datetime
                        .checked_add_signed(Duration::days(days))
                        .ok_or(UpdateProgramDocumentError::InternalError(format!(
                            "Invalid schedule days value: {}",
                            days
                        )))?;
                }
                if let Some(minutes) = schedule_config.config.schedule_in.minutes {
                    active_start_datetime = start_datetime
                        .checked_add_signed(Duration::minutes(minutes))
                        .ok_or(UpdateProgramDocumentError::InternalError(format!(
                            "Invalid schedule minutes value: {}",
                            minutes
                        )))?;
                }

                let data = extract_config_data(&schedule_config.event, &doc.data);
                output.push(EventInput {
                    active_start_datetime,
                    document_type: schedule_config
                        .event
                        .document_type
                        .unwrap_or(doc.r#type.clone()),
                    document_name: if schedule_config.event.document_name.unwrap_or(false) {
                        Some(doc.name.clone())
                    } else {
                        None
                    },
                    r#type: schedule_config.event.r#type,
                    name: data,
                });
            }
            Config::Field(field_config) => {
                if !match_all_conditions(field_config.conditions, doc) {
                    continue;
                }
                let data = extract_config_data(&field_config.event, &doc.data);
                output.push(EventInput {
                    active_start_datetime: base_time,
                    document_type: field_config
                        .event
                        .document_type
                        .unwrap_or(doc.r#type.clone()),
                    document_name: if field_config.event.document_name.unwrap_or(false) {
                        Some(doc.name.clone())
                    } else {
                        None
                    },
                    r#type: field_config.event.r#type,
                    name: data,
                });
            }
        }
    }

    Ok(output)
}

/// * `base_time` - the document time, e.g. for encounters it's the start_datetime
pub fn update_program_document(
    ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    patient_id: &str,
    base_time: NaiveDateTime,
    previous_base_time: Option<NaiveDateTime>,
    doc: RawDocument,
    allowed_docs: Vec<String>,
) -> Result<Document, UpdateProgramDocumentError> {
    ctx.connection
        .transaction_sync(|_| {
            let event_inputs =
                extract_events(ctx, service_provider, base_time, &doc, &allowed_docs)?;
            if let Some(previous_base_time) = previous_base_time {
                // the base time has changed, remove all events for the old base time
                // Example of the problem, if the previous_base_time was accidentally set a year
                // into the future and is than fixed, old event from the previous_base_time would
                // take precedence for a long time.
                if previous_base_time != base_time {
                    service_provider.program_event_service.upsert_events(
                        ctx,
                        patient_id.to_string(),
                        base_time,
                        vec![],
                    )?;
                }
            }
            service_provider.program_event_service.upsert_events(
                ctx,
                patient_id.to_string(),
                base_time,
                event_inputs,
            )?;
            let result = service_provider
                .document_service
                .update_document(ctx, doc, &allowed_docs)
                .map_err(|err| match err {
                    DocumentInsertError::NotAllowedToMutateDocument => {
                        UpdateProgramDocumentError::NotAllowedToMutateDocument
                    }
                    DocumentInsertError::InvalidDataSchema(err) => {
                        UpdateProgramDocumentError::InvalidDataSchema(err)
                    }
                    DocumentInsertError::DatabaseError(err) => {
                        UpdateProgramDocumentError::DatabaseError(err)
                    }
                    DocumentInsertError::InternalError(err) => {
                        UpdateProgramDocumentError::InternalError(err)
                    }
                    DocumentInsertError::DataSchemaDoesNotExist => {
                        UpdateProgramDocumentError::DataSchemaDoesNotExist
                    }
                    DocumentInsertError::InvalidParent(_) => {
                        UpdateProgramDocumentError::InvalidParentId
                    }
                })?;
            Ok(result)
        })
        .map_err(|err: TransactionError<UpdateProgramDocumentError>| err.to_inner_error())
}

fn is_truthy(value: &Value) -> bool {
    if value.is_null() {
        return false;
    }
    if let Some(string) = value.as_str() {
        return string != "";
    }
    if let Some(int) = value.as_i64() {
        return int != 0;
    }
    if let Some(int) = value.as_u64() {
        return int != 0;
    }
    if let Some(float) = value.as_f64() {
        return float != 0.0;
    }
    return true;
}

fn match_condition(condition: &Condition, doc: &RawDocument) -> bool {
    let Some(field) = extract_value_field(&doc.data, &condition.field) else {
        if condition.is_falsy.is_some() {
            return true;
        }
        return false;
    };
    if condition.is_set.is_some() {
        return !field.is_null();
    } else if condition.is_falsy.is_some() {
        return !is_truthy(&field);
    } else if condition.is_truthy.is_some() {
        return is_truthy(&field);
    }
    false
}

fn match_all_conditions(conditions: Option<Vec<Condition>>, doc: &RawDocument) -> bool {
    let Some(conditions) = conditions else {
        return false;
    };
    conditions
        .into_iter()
        .all(|condition| match_condition(&condition, doc))
}

fn extract_config_data(target: &Target, data: &Value) -> Option<String> {
    target
        .data_field
        .as_ref()
        .map(|field| extract_string_field(data, field))
        .flatten()
        .or(target.data.clone())
}

fn extract_field<T, F>(data: &Value, path: &str, extract: &F) -> Option<T>
where
    F: Fn(&Value) -> Option<T>,
{
    let Some(data) = data.as_object() else {return None};
    let parts = path
        .split(".")
        .map(|p| p.to_string())
        .collect::<Vec<String>>();

    let mut reference: &Map<String, Value> = data;
    let parts_len = parts.len();
    for (index, part) in parts.into_iter().enumerate() {
        let Some(next) = reference
        .get(&part) else {
            return None;
        };
        if index + 1 == parts_len {
            return extract(next);
        }
        let Some(next_obj) = next.as_object() else {
            return None;
        };

        reference = next_obj
    }
    None
}

fn extract_value_field(data: &Value, path: &str) -> Option<Value> {
    extract_field(data, path, &|v| Some(v.clone()))
}

fn extract_string_field(data: &Value, path: &str) -> Option<String> {
    extract_field(data, path, &|v| v.as_str().map(|s| s.to_string()))
}

fn extract_naivedatetime_field(data: &Value, path: &str) -> Option<NaiveDateTime> {
    extract_field(data, path, &|v| {
        v.as_str()
            .map(|s| {
                DateTime::parse_from_rfc3339(s)
                    .map(|t| Some(t.naive_utc()))
                    .unwrap_or(None)
            })
            .flatten()
    })
}

impl From<RepositoryError> for UpdateProgramDocumentError {
    fn from(err: RepositoryError) -> Self {
        UpdateProgramDocumentError::DatabaseError(err)
    }
}
