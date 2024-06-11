use chrono::{DateTime, Duration, Months, NaiveDateTime, Utc};
use repository::{
    Document, EventCondition, EventConfigEnum, EventTarget, RepositoryError, StorageConnection,
};
use serde_json::{Map, Value};

use crate::document::document_registry::{DocumentRegistryService, DocumentRegistryServiceTrait};

use super::program_event::{EventInput, ProgramEventService, ProgramEventServiceTrait};

#[derive(Debug)]
pub enum UpdateProgramDocumentError {
    DatabaseError(RepositoryError),
    InternalError(String),
}

fn extract_events(
    connection: &StorageConnection,
    base_time: NaiveDateTime,
    doc: &Document,
    allowed_ctx: Option<&[String]>,
) -> Result<Vec<EventInput>, UpdateProgramDocumentError> {
    let Some(registry_entries) = DocumentRegistryService {}
        .get_entries_by_doc_type(connection, vec![doc.r#type.clone()], allowed_ctx)?
        .pop()
    else {
        return Ok(vec![]);
    };

    let Some(config) = registry_entries.config else {
        return Ok(vec![]);
    };

    let mut output = vec![];
    for config in config.events {
        match config {
            EventConfigEnum::Schedule(schedule_config) => {
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

                if let Some(months) = schedule_config.config.schedule_in.months {
                    active_start_datetime = active_start_datetime
                        .checked_add_months(Months::new(months as u32))
                        .ok_or(UpdateProgramDocumentError::InternalError(format!(
                            "Invalid schedule months value: {}",
                            months
                        )))?;
                }
                if let Some(days) = schedule_config.config.schedule_in.days {
                    active_start_datetime = active_start_datetime
                        .checked_add_signed(Duration::days(days))
                        .ok_or(UpdateProgramDocumentError::InternalError(format!(
                            "Invalid schedule days value: {}",
                            days
                        )))?;
                }
                if let Some(minutes) = schedule_config.config.schedule_in.minutes {
                    active_start_datetime = active_start_datetime
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
            EventConfigEnum::Field(field_config) => {
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
pub fn update_program_events(
    connection: &StorageConnection,
    patient_id: &str,
    base_time: NaiveDateTime,
    previous_base_time: Option<NaiveDateTime>,
    doc: &Document,
    allowed_ctx: Option<&[String]>,
) -> Result<(), UpdateProgramDocumentError> {
    let event_inputs = extract_events(connection, base_time, doc, allowed_ctx)?;
    if let Some(previous_base_time) = previous_base_time {
        // the base time has changed, remove all events for the old base time
        // Example of the problem, if the previous_base_time was accidentally set a year
        // into the future and is than fixed, old event from the previous_base_time would
        // take precedence for a long time.
        if previous_base_time != base_time {
            ProgramEventService {}.upsert_events(
                connection,
                patient_id.to_string(),
                previous_base_time,
                &doc.context_id,
                vec![],
            )?;
        }
    }
    ProgramEventService {}.upsert_events(
        connection,
        patient_id.to_string(),
        base_time,
        &doc.context_id,
        event_inputs,
    )?;
    Ok(())
}

fn is_truthy(value: &Value) -> bool {
    if value.is_null() {
        return false;
    }
    if let Some(b) = value.as_bool() {
        return b;
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
    true
}

fn match_condition(condition: &EventCondition, doc: &Document) -> bool {
    let Some(field) = extract_value_field(&doc.data, &condition.field) else {
        if condition.is_falsy.unwrap_or(false) {
            return true;
        }
        return false;
    };
    if condition.is_set.unwrap_or(false) {
        return !field.is_null();
    }
    if condition.is_falsy.unwrap_or(false) {
        return !is_truthy(&field);
    } else if condition.is_truthy.unwrap_or(false) {
        return is_truthy(&field);
    }

    // string match
    if let Some(field_str) = field.as_str() {
        if let Some(equal_to) = &condition.equal_to {
            return equal_to == field_str;
        }
        if let Some(equal_any) = &condition.equal_any {
            return equal_any.iter().any(|s| s == field_str);
        }
    }

    // compare numbers
    if let Some(field_number) = field.as_f64() {
        if let Some(less_than_or_equal_to) = condition.less_than_or_equal_to {
            return less_than_or_equal_to <= field_number;
        }
        if let Some(less_than) = condition.less_than {
            return less_than < field_number;
        }
        if let Some(greater_than_or_equal_to) = condition.greater_than_or_equal_to {
            return greater_than_or_equal_to >= field_number;
        }
        if let Some(greater_than) = condition.greater_than {
            return greater_than > field_number;
        }
    }
    false
}

fn match_all_conditions(conditions: Vec<EventCondition>, doc: &Document) -> bool {
    conditions
        .into_iter()
        .all(|condition| match_condition(&condition, doc))
}

fn extract_config_data(target: &EventTarget, data: &Value) -> Option<String> {
    target
        .data_field
        .as_ref()
        .and_then(|field| extract_simple_field(data, field))
        .or(target.data.clone())
}

fn extract_field<T, F>(data: &Value, path: &str, extract: &F) -> Option<T>
where
    F: Fn(&Value) -> Option<T>,
{
    let data = data.as_object()?;
    let parts = path
        .split(".")
        .map(|p| p.to_string())
        .collect::<Vec<String>>();

    let mut reference: &Map<String, Value> = data;
    let parts_len = parts.len();
    for (index, part) in parts.into_iter().enumerate() {
        let next = reference.get(&part)?;
        if index + 1 == parts_len {
            return extract(next);
        }
        let next_obj = next.as_object()?;

        reference = next_obj
    }
    None
}

fn extract_value_field(data: &Value, path: &str) -> Option<Value> {
    extract_field(data, path, &|v| Some(v.clone()))
}

/// extracts a string, number of bool as a string
fn extract_simple_field(data: &Value, path: &str) -> Option<String> {
    extract_field(data, path, &|v| {
        if let Some(s) = v.as_str() {
            return Some(s.to_string());
        }
        if let Some(number) = v.as_i64() {
            return Some(format!("{number}"));
        }
        if let Some(number) = v.as_u64() {
            return Some(format!("{number}"));
        }
        if let Some(number) = v.as_f64() {
            return Some(format!("{number}"));
        }
        if let Some(v) = v.as_bool() {
            return Some(format!("{v}"));
        }
        None
    })
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
