use crate::sync::{
    api::RemoteSyncRecordV5,
    sync_serde::{
        date_to_isostring, empty_str_as_option_string, naive_time,
    },
};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};

use repository::{
    ChangelogRow, ChangelogTableName, TemperatureLogRow, TemperatureLogRowRepository, StorageConnection,
    SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{
    IntegrationRecords, LegacyTableName, PullDependency, PullUpsertRecord, SyncTranslation,
};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::TEMPERATURE_LOG;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::TemperatureLog
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyTemperatureLogRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub temperature: f64,
    #[serde(rename = "sensor_ID")]
    pub sensor_id: String,
    #[serde(rename = "location_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub location_id: Option<String>,
    #[serde(rename = "store_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub store_id: Option<String>,
    #[serde(serialize_with = "date_to_isostring")]
    pub date: NaiveDate,
    #[serde(deserialize_with = "naive_time")]
    pub time: NaiveTime,
}

pub(crate) struct TemperatureLogTranslation {}
impl SyncTranslation for TemperatureLogTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::TEMPERATURE_LOG,
            dependencies: vec![LegacyTableName::LOCATION, LegacyTableName::SENSOR, LegacyTableName::STORE],
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

        let data = serde_json::from_str::<LegacyTemperatureLogRow>(&sync_record.data)?;

        let LegacyTemperatureLogRow {
            id,
            temperature,
            sensor_id,
            location_id,
            store_id,
            date,
            time,
        } = data;

        let timestamp = NaiveDateTime::new(date, time);

        let result = TemperatureLogRow {
            id,
            temperature,
            sensor_id,
            location_id,
            store_id,
            timestamp,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::TemperatureLog(result),
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

        let TemperatureLogRow {
            id,
            temperature,
            sensor_id,
            location_id,
            store_id,
            timestamp,
        } = TemperatureLogRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "TemperatureLog row ({}) not found",
                changelog.record_id
            )))?;

        let date = timestamp.date();
        let time = timestamp.time();

        let legacy_row = LegacyTemperatureLogRow {
            id,
            temperature,
            sensor_id,
            location_id,
            store_id,
            date,
            time,
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
    async fn test_temperature_log_translation() {
        use crate::sync::test::test_data::temperature_log as test_data;
        let translator = TemperatureLogTranslation {};

        let (_, connection, _, _) =
            setup_all("test_temperature_log_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
