use crate::sync::{
    sync_serde::{
        date_option_to_isostring, empty_str_as_option, empty_str_as_option_string, naive_time,
        zero_date_as_option,
    },
    translations::{location::LocationTranslation, store::StoreTranslation},
};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};

use repository::{
    get_sensor_type, ChangelogRow, ChangelogTableName, SensorRow, SensorRowRepository, SensorType,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};
#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacySensorRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "macAddress")]
    pub serial: String,
    #[serde(rename = "locationID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub location_id: Option<String>,
    #[serde(rename = "storeID")]
    pub store_id: String,
    #[serde(rename = "batteryLevel")]
    pub battery_level: Option<i32>,
    #[serde(rename = "logInterval")]
    pub log_interval: Option<i32>,
    pub is_active: bool,
    #[serde(rename = "lastConnectionDate")]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub last_connection_date: Option<NaiveDate>,
    #[serde(rename = "lastConnectionTime")]
    #[serde(deserialize_with = "naive_time")]
    pub last_connection_time: NaiveTime,
    #[serde(rename = "om_last_connection_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub last_connection_datetime: Option<NaiveDateTime>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(SensorTranslation)
}

pub(crate) struct SensorTranslation;
impl SyncTranslation for SensorTranslation {
    fn table_name(&self) -> &str {
        "sensor"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            LocationTranslation.table_name(),
            StoreTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Sensor)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacySensorRow>(&sync_record.data)?;

        let LegacySensorRow {
            id,
            name,
            serial,
            location_id,
            store_id,
            battery_level,
            log_interval,
            is_active,
            last_connection_date,
            last_connection_time,
            last_connection_datetime,
        } = data;

        let serial = serial.split(" |").nth(0).unwrap_or_default().to_string();
        let r#type = get_sensor_type(&serial);

        let result = SensorRow {
            id,
            name,
            serial,
            location_id,
            store_id,
            battery_level,
            log_interval,
            is_active,
            last_connection_datetime:
                last_connection_datetime
                    .or(last_connection_date
                        .map(|date| NaiveDateTime::new(date, last_connection_time))),
            r#type,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let SensorRow {
            id,
            name,
            serial,
            location_id,
            store_id,
            battery_level,
            log_interval,
            is_active,
            last_connection_datetime,
            r#type,
        } = SensorRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Sensor row ({}) not found",
                changelog.record_id
            )))?;

        let last_connection_date = last_connection_datetime.map(|t| t.date());

        let last_connection_time = last_connection_datetime
            .map(|last_connection_datetime: NaiveDateTime| last_connection_datetime.time())
            .unwrap_or(NaiveTime::from_hms_opt(0, 0, 0).unwrap());

        let r#type = match r#type {
            SensorType::BlueMaestro => "BLUE_MAESTRO",
            SensorType::Laird => "LAIRD",
            SensorType::Berlinger => "BERLINGER",
        }
        .to_string();

        let serial = [serial, r#type].join(" | ");

        let legacy_row = LegacySensorRow {
            id,
            name,
            serial,
            location_id,
            store_id,
            battery_level,
            log_interval,
            is_active,
            last_connection_date,
            last_connection_time,
            last_connection_datetime,
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
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_sensor_translation() {
        use crate::sync::test::test_data::sensor as test_data;
        let translator = SensorTranslation {};

        let (_, connection, _, _) =
            setup_all("test_sensor_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
