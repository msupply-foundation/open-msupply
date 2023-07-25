use crate::sync::{
    api::RemoteSyncRecordV5,
    sync_serde::{
        date_from_date_time, date_option_to_isostring, date_to_isostring, empty_str_as_option,
        empty_str_as_option_string, naive_time, zero_date_as_option,
    },
};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};

use repository::{
    SensorRow, SensorRowRepository, ChangelogRow, ChangelogTableName, StorageConnection,
    SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{
    IntegrationRecords, LegacyTableName, PullDependency, PullUpsertRecord, SyncTranslation,
};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::SENSOR;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::Sensor
}

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
    pub location_id: Option<String>,
    #[serde(rename = "StoreID")]
    pub store_id: Option<String>,
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
}

pub(crate) struct SensorTranslation {}
impl SyncTranslation for SensorTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::SENSOR,
            dependencies: vec![LegacyTableName::LOCATION,LegacyTableName::STORE],
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

        let data = serde_json::from_str::<LegacySensorRow>(&sync_record.data)?;

        let last_connection_timestamp = data
        .last_connection_date
        .map(|last_connection_date| NaiveDateTime::new(last_connection_date, data.last_connection_time));

        let deserialised_row = match serde_json::from_str::<LegacySensorRow>(&sync_record.data) {
            Ok(row) => row,
            Err(e) => {
                log::warn!("Failed to deserialise sensor row: {:?}", e);
                return Ok(None);
            }
        };
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
        } = deserialised_row;

        let result = SensorRow {
            id,
            name,
            serial,
            location_id,
            store_id,
            battery_level,
            log_interval,
            is_active,
            last_connection_timestamp,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Sensor(result),
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

        let SensorRow {
            id,
            name,
            serial,
            location_id,
            store_id,
            battery_level,
            log_interval,
            is_active,
            last_connection_timestamp,
        } = SensorRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Sensor row ({}) not found",
                changelog.record_id
            )))?;

        let mut last_connection_date = None;

        if let Some(last_connected_timestamp) = last_connection_timestamp {
            last_connection_date = Some(last_connected_timestamp.date());
        }

        let last_connection_time = last_connection_timestamp
            .map(|last_connection_timestamp: NaiveDateTime| last_connection_timestamp.time())
            .unwrap_or(NaiveTime::from_hms_opt(0, 0, 0).unwrap());

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
    async fn test_sensor_translation() {
        use crate::sync::test::test_data::sensor as test_data;
        let translator = SensorTranslation {};

        let (_, connection, _, _) =
            setup_all("test_sensor_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
