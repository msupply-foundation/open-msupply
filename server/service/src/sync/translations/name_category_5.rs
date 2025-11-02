use repository::{
    activity_log::{ActivityLogFilter, ActivityLogRepository},
    types::PropertyValueType,
    ChangelogRow, ChangelogTableName, EqualFilter, PropertyRow, PropertyRowRepository,
    StorageConnection, SyncBufferRow,
};

use serde::{Deserialize, Serialize};

use crate::sync::{
    api::{CommonSyncRecord, SyncAction},
    translations::{
        PullTranslateResult, PushSyncRecord, PushTranslateResult, SyncTranslation,
        ToSyncRecordTranslationType,
    },
};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyNameCategory5Row {
    pub ID: String,
    pub description: String,
    #[serde(rename = "type")]
    pub r#type: String,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NameCategory5Translation)
}

pub(super) struct NameCategory5Translation;
impl SyncTranslation for NameCategory5Translation {
    fn table_name(&self) -> &str {
        "name_category5"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Property)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<super::PullTranslateResult, anyhow::Error> {
        let LegacyNameCategory5Row {
            ID: _,
            description,
            r#type: _,
        } = serde_json::from_str::<LegacyNameCategory5Row>(&sync_record.data)?;

        let property_id = "supply_level".to_string();

        let supply_level_property =
            PropertyRowRepository::new(connection).find_one_by_id(&property_id)?;

        let allowed_values = match &supply_level_property.and_then(|p| p.allowed_values.clone()) {
            Some(existing_values) => {
                let values: Vec<&str> = existing_values.split(',').map(|s| s.trim()).collect();
                if values.contains(&description.as_str()) {
                    Some(existing_values.clone())
                } else {
                    Some(format!("{},{}", existing_values, description))
                }
            }
            None => Some(description.clone()),
        };

        let result = PropertyRow {
            id: property_id.clone(),
            key: property_id,
            name: "Supply Level".to_string(),
            value_type: PropertyValueType::String,
            allowed_values,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PushToLegacyCentral => {
                if self.change_log_type().as_ref() != Some(&row.table_name) {
                    return false;
                }
                row.record_id == "supply_level"
            }
            _ => false,
        }
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let property = PropertyRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Property row ({}) not found",
                changelog.record_id
            )))?;

        let activity_log = ActivityLogRepository::new(connection)
            .query_by_filter(
                ActivityLogFilter::new().record_id(EqualFilter::equal_to(&changelog.record_id)),
            )?
            .into_iter()
            .max_by_key(|log| log.activity_log_row.datetime);

        let previous_values = match activity_log {
            Some(log) => match log.activity_log_row.changed_from {
                Some(ref s) => s.split(',').map(|v| v.trim().to_string()).collect(),
                None => Vec::new(),
            },
            None => Vec::new(),
        };

        let current_values = match &property.allowed_values {
            Some(values) => values
                .split(',')
                .map(|s| s.trim().to_string())
                .collect::<Vec<_>>(),
            None => {
                return Ok(PushTranslateResult::Ignored(
                    "No allowed values to push".to_string(),
                ))
            }
        };

        let removed_values: Vec<String> = previous_values
            .into_iter()
            .filter(|v| !current_values.contains(v))
            .collect();

        let mut records = Vec::new();

        if !removed_values.is_empty() {
            for description in removed_values {
                let id = format!("{}:{}", changelog.record_id, description);
                let legacy_row = LegacyNameCategory5Row {
                    ID: id.clone(),
                    description: description.to_string(),
                    r#type: 'c'.to_string(),
                };

                records.push(PushSyncRecord {
                    cursor: changelog.cursor,
                    record: CommonSyncRecord {
                        table_name: self.table_name().to_string(),
                        record_id: id,
                        action: SyncAction::Delete,
                        record_data: serde_json::to_value(legacy_row)?,
                    },
                });
            }
        } else {
            for description in current_values.iter() {
                let id = format!("{}:{}", changelog.record_id, description);
                let legacy_row = LegacyNameCategory5Row {
                    ID: id.clone(),
                    description: description.to_string(),
                    r#type: 'c'.to_string(),
                };

                records.push(PushSyncRecord {
                    cursor: changelog.cursor,
                    record: CommonSyncRecord {
                        table_name: self.table_name().to_string(),
                        record_id: id,
                        action: SyncAction::Update,
                        record_data: serde_json::to_value(legacy_row)?,
                    },
                });
            }
        }

        Ok(PushTranslateResult::PushRecord(records))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        connection: &StorageConnection,
        sync_buffer: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let mut parts = sync_buffer.record_id.splitn(2, ':');
        let _og_id = parts.next().unwrap_or("");
        let description = parts.next().ok_or_else(|| {
            anyhow::Error::msg(format!(
                "Invalid record_id format for delete: expected 'id:description', got '{}'",
                sync_buffer.record_id
            ))
        })?;

        let mut property = PropertyRowRepository::new(connection)
            .find_one_by_id("supply_level")?
            .ok_or_else(|| anyhow::Error::msg("Property row (supply_level) not found"))?;

        property.allowed_values = property
            .allowed_values
            .as_ref()
            .map(|values| {
                values
                    .split(',')
                    .map(|s| s.trim())
                    .filter(|v| *v != description)
                    .collect::<Vec<_>>()
                    .join(",")
            })
            .filter(|s| !s.is_empty());

        Ok(PullTranslateResult::upsert(property))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_name_category_5_translation() {
        use crate::sync::test::test_data::name_category_5 as test_data;
        let translator = NameCategory5Translation {};

        let (_, connection, _, _) =
            setup_all("test_name_category_5_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .expect(&format!(
                    "Error translating from upsert sync record {:?}",
                    record.sync_buffer_row.record_id
                ));

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
