use crate::sync::{
    api::RemoteSyncRecordV5,
    sync_serde::{
        date_option_to_isostring, empty_str_as_option, empty_str_as_option_string, naive_time,
        zero_date_as_option,
    },
};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};

use repository::{
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow, TemperatureLogRow,
    TemperatureLogRowRepository,
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
    pub store_id: String,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub date: Option<NaiveDate>,
    #[serde(deserialize_with = "naive_time")]
    pub time: NaiveTime,
    #[serde(rename = "temperature_breach_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub temperature_breach_id: Option<String>,
    #[serde(rename = "om_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub datetime: Option<NaiveDateTime>,
}

pub(crate) struct TemperatureLogTranslation {}
impl SyncTranslation for TemperatureLogTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::TEMPERATURE_LOG,
            dependencies: vec![
                LegacyTableName::STORE,
                LegacyTableName::LOCATION,
                LegacyTableName::SENSOR,
                LegacyTableName::TEMPERATURE_BREACH,
            ],
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
            temperature_breach_id,
            datetime,
        } = data;

        let result = TemperatureLogRow {
            id,
            temperature,
            sensor_id,
            location_id,
            store_id,
            datetime: datetime
                .or(date.map(|date| NaiveDateTime::new(date, time)))
                .unwrap(),
            temperature_breach_id,
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
            datetime,
            temperature_breach_id,
        } = TemperatureLogRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "TemperatureLog row ({}) not found",
                changelog.record_id
            )))?;

        let legacy_row = LegacyTemperatureLogRow {
            id,
            temperature,
            sensor_id,
            location_id,
            store_id,
            date: Some(datetime.date()),
            time: datetime.time(),
            temperature_breach_id,
            datetime: Some(datetime),
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
