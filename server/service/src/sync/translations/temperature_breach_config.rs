use crate::sync::{
    api::RemoteSyncRecordV5,
    sync_serde::empty_str_as_option_string,
};

use repository::{
    ChangelogRow, ChangelogTableName, TemperatureBreachConfigRow, TemperatureBreachConfigRowRepository, StorageConnection,
    SyncBufferRow, TemperatureBreachRowType,
};
use serde::{Deserialize, Serialize};

use super::{
    IntegrationRecords, LegacyTableName, PullDependency, PullUpsertRecord, SyncTranslation, temperature_breach::{LegacyTemperatureBreachType, from_legacy_breach_type, to_legacy_breach_type},
};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::TEMPERATURE_BREACH_CONFIG;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::TemperatureBreachConfig
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyTemperatureBreachConfigRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub duration: i32,
    #[serde(rename = "type")]
    pub r#type: LegacyTemperatureBreachType,
    pub description: String,
    #[serde(rename = "store_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub store_id: Option<String>,
    pub is_active: bool,
    pub minimum_temperature: f64,
    pub maximum_temperature: f64,
}

pub(crate) struct TemperatureBreachConfigTranslation {}
impl SyncTranslation for TemperatureBreachConfigTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::TEMPERATURE_BREACH,
            dependencies: vec![LegacyTableName::STORE],
        }
    }

    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyTemperatureBreachConfigRow>(&sync_record.data)?;
        let r#type = from_legacy_breach_type(&data.r#type);
        
        let result = TemperatureBreachConfigRow {
            id: data.id,
            duration: data.duration,
            r#type,
            description: data.description,
            store_id: data.store_id,
            is_active: data.is_active,
            minimum_temperature: data.minimum_temperature,
            maximum_temperature: data.maximum_temperature,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::TemperatureBreachConfig(result),
        )))
    }

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        if !match_push_table(changelog) {
            return Ok(None);
        }

        let TemperatureBreachConfigRow {
            id,
            duration,
            r#type,
            description,
            store_id,
            is_active,
            minimum_temperature,
            maximum_temperature,
        } = TemperatureBreachConfigRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "TemperatureBreachConfig row ({}) not found",
                changelog.record_id
            )))?;

        let r#type = to_legacy_breach_type(&r#type);

        let legacy_row = LegacyTemperatureBreachConfigRow {
            id,
            duration,
            r#type,
            description,
            store_id,
            is_active,
            minimum_temperature,
            maximum_temperature,
        };
        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LEGACY_TABLE_NAME,
            serde_json::to_value(&legacy_row)?,
        )]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_temperature_breach_config_translation() {
        use crate::sync::test::test_data::temperature_breach_config as test_data;
        let translator = TemperatureBreachConfigTranslation {};

        let (_, connection, _, _) =
            setup_all("test_temperature_breach_config_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
