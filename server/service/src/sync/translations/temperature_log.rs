use crate::sync::{
    sync_serde::{
        date_option_to_isostring, empty_str_as_option, empty_str_as_option_string, naive_time,
        zero_date_as_option,
    },
    translations::{
        location::LocationTranslation, sensor::SensorTranslation, store::StoreTranslation,
        temperature_breach::TemperatureBreachTranslation,
    },
};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};

use repository::{
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow, TemperatureLogRow,
    TemperatureLogRowRepository,
};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

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

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(TemperatureLogTranslation)
}

pub(crate) struct TemperatureLogTranslation;
impl SyncTranslation for TemperatureLogTranslation {
    fn table_name(&self) -> &'static str {
        "temperature_log"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            StoreTranslation.table_name(),
            LocationTranslation.table_name(),
            SensorTranslation.table_name(),
            TemperatureBreachTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::TemperatureLog)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
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

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
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
        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(&legacy_row)?,
        ))
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
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
