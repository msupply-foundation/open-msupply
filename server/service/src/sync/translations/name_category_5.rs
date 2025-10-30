use repository::{
    types::PropertyValueType, ChangelogRow, ChangelogTableName, PropertyRow, PropertyRowRepository,
    StorageConnection, SyncBufferRow,
};

use serde::{Deserialize, Serialize};
use util::uuid::uuid;

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

        let values = match &property.allowed_values {
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

        let mut records = Vec::new();
        for description in values.iter() {
            let id = uuid();
            let legacy_row = LegacyNameCategory5Row {
                ID: id.clone(),
                description: description.clone(),
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

        Ok(PushTranslateResult::PushRecord(records))
    }
}

// TODO:
// - Finish tests
// - Figure out how to manage delete,
//   current configuration in OMS saves everything into one id (id = key name),
//   which makes us lose track of the name_category5 ID
