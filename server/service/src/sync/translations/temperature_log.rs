use crate::sync::translations::{
    location::LocationTranslation, sensor::SensorTranslation, store::StoreTranslation,
    temperature_breach::TemperatureBreachTranslation,
};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use util::sync_serde::{
    date_option_to_isostring, empty_str_as_option, empty_str_as_option_string, naive_time,
    zero_date_as_option,
};

use repository::{
    ChangelogRow, ChangelogTableName, LocationRowRepository, StorageConnection, SyncBufferRow,
    TemperatureBreachRowRepository, TemperatureLogRow, TemperatureLogRowRepository,
};
use serde::{Deserialize, Serialize};

use super::{
    to_legacy_time, utils::clear_invalid_fk, PullTranslateResult, PushTranslateResult,
    SyncTranslation,
};

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
    fn table_name(&self) -> &str {
        "temperature_log"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
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
        connection: &StorageConnection,
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

        let location_id = clear_invalid_fk(
            connection,
            "temperature_log",
            &id,
            "location_id",
            location_id,
            |c, id| LocationRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;
        let temperature_breach_id = clear_invalid_fk(
            connection,
            "temperature_log",
            &id,
            "temperature_breach_id",
            temperature_breach_id,
            |c, id| TemperatureBreachRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;

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
            time: to_legacy_time(datetime),
            temperature_breach_id,
            datetime: Some(datetime),
        };
        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::MockDataInserts,
        system_log_row::{SystemLogRowRepository, SystemLogType},
        test_db::setup_all,
        SyncAction,
    };

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

    #[actix_rt::test]
    async fn test_temperature_log_clears_invalid_optional_fks_and_writes_system_log() {
        let translator = TemperatureLogTranslation {};
        let (_, connection, _, _) = setup_all(
            "test_temperature_log_clears_invalid_optional_fks_and_writes_system_log",
            MockDataInserts::none(),
        )
        .await;

        let sync_record = SyncBufferRow {
            table_name: "temperature_log".to_string(),
            record_id: "TEMP_LOG_FK_INVALID".to_string(),
            data: r#"{
                "ID": "TEMP_LOG_FK_INVALID",
                "temperature": 5.0,
                "sensor_ID": "sensor_a",
                "location_ID": "does_not_exist_location",
                "store_ID": "store_a",
                "date": "2024-01-01",
                "time": "12:00:00",
                "temperature_breach_ID": "does_not_exist_breach",
                "om_datetime": "2024-01-01T12:00:00"
            }"#
            .to_string(),
            action: SyncAction::Upsert,
            ..Default::default()
        };

        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &sync_record)
            .unwrap();
        let debug = format!("{result:?}");
        assert!(
            debug.contains("location_id: None"),
            "{}",
            format!("expected location_id None; got:\n{debug}")
        );
        assert!(
            debug.contains("temperature_breach_id: None"),
            "{}",
            format!("expected temperature_breach_id None; got:\n{debug}")
        );

        let logs = SystemLogRowRepository::new(&connection)
            .find_all()
            .unwrap();
        let fk_errors: Vec<_> = logs
            .iter()
            .filter(|l| l.r#type == SystemLogType::SyncTranslationFkError && l.is_error)
            .collect();
        assert_eq!(fk_errors.len(), 2, "got {fk_errors:?}");
    }
}
