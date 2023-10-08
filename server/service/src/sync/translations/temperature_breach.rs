use crate::sync::{
    api::RemoteSyncRecordV5,
    sync_serde::{date_to_isostring, empty_str_as_option_string, naive_time},
};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};

use repository::{
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow, TemperatureBreachRow,
    TemperatureBreachRowRepository, TemperatureBreachRowType,
};
use serde::{Deserialize, Serialize};

use super::{
    IntegrationRecords, LegacyTableName, PullDependency, PullUpsertRecord, SyncTranslation,
};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::TEMPERATURE_BREACH;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::TemperatureBreach
}

#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LegacyTemperatureBreachType {
    ColdConsecutive,
    HotConsecutive,
    ColdCumulative,
    HotCumulative,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyTemperatureBreachRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub duration: i32,
    #[serde(rename = "type")]
    pub r#type: LegacyTemperatureBreachType,
    #[serde(rename = "sensor_ID")]
    pub sensor_id: String,
    #[serde(rename = "location_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub location_id: Option<String>,
    #[serde(rename = "store_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub store_id: Option<String>,
    #[serde(serialize_with = "date_to_isostring")]
    pub start_date: NaiveDate,
    #[serde(deserialize_with = "naive_time")]
    pub start_time: NaiveTime,
    #[serde(serialize_with = "date_to_isostring")]
    pub end_date: NaiveDate,
    #[serde(deserialize_with = "naive_time")]
    pub end_time: NaiveTime,
    pub acknowledged: bool,
    #[serde(rename = "threshold_minimum_temperature")]
    pub threshold_minimum: f64,
    #[serde(rename = "threshold_maximum_temperature")]
    pub threshold_maximum: f64,
    pub threshold_duration: i32,
}

pub(crate) struct TemperatureBreachTranslation {}
impl SyncTranslation for TemperatureBreachTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::TEMPERATURE_BREACH,
            dependencies: vec![
                LegacyTableName::LOCATION,
                LegacyTableName::SENSOR,
                LegacyTableName::STORE,
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

        let data = serde_json::from_str::<LegacyTemperatureBreachRow>(&sync_record.data)?;
        let r#type = from_legacy_breach_type(&data.r#type);
        let start_datetime = NaiveDateTime::new(data.start_date, data.start_time);
        let end_datetime = NaiveDateTime::new(data.end_date, data.end_time);

        let result = TemperatureBreachRow {
            id: data.id,
            duration: data.duration,
            r#type,
            sensor_id: data.sensor_id,
            location_id: data.location_id,
            store_id: data.store_id,
            start_datetime,
            end_datetime,
            acknowledged: data.acknowledged,
            threshold_minimum: data.threshold_minimum,
            threshold_maximum: data.threshold_maximum,
            threshold_duration: data.threshold_duration,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::TemperatureBreach(result),
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

        let TemperatureBreachRow {
            id,
            duration,
            r#type,
            sensor_id,
            location_id,
            store_id,
            start_datetime,
            end_datetime,
            acknowledged,
            threshold_minimum,
            threshold_maximum,
            threshold_duration,
        } = TemperatureBreachRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "TemperatureBreach row ({}) not found",
                changelog.record_id
            )))?;

        let start_date = start_datetime.date();
        let start_time = start_datetime.time();
        let end_date = end_datetime.date();
        let end_time = end_datetime.time();
        let r#type = to_legacy_breach_type(&r#type);

        let legacy_row = LegacyTemperatureBreachRow {
            id,
            duration,
            r#type,
            sensor_id,
            location_id,
            store_id,
            start_date,
            start_time,
            end_date,
            end_time,
            acknowledged,
            threshold_minimum,
            threshold_maximum,
            threshold_duration,
        };
        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LEGACY_TABLE_NAME,
            serde_json::to_value(&legacy_row)?,
        )]))
    }
}

pub fn from_legacy_breach_type(t: &LegacyTemperatureBreachType) -> TemperatureBreachRowType {
    match t {
        LegacyTemperatureBreachType::ColdConsecutive => TemperatureBreachRowType::ColdConsecutive,
        LegacyTemperatureBreachType::HotConsecutive => TemperatureBreachRowType::HotConsecutive,
        LegacyTemperatureBreachType::ColdCumulative => TemperatureBreachRowType::ColdCumulative,
        LegacyTemperatureBreachType::HotCumulative => TemperatureBreachRowType::HotCumulative,
    }
}

pub fn to_legacy_breach_type(t: &TemperatureBreachRowType) -> LegacyTemperatureBreachType {
    match t {
        TemperatureBreachRowType::ColdConsecutive => LegacyTemperatureBreachType::ColdConsecutive,
        TemperatureBreachRowType::HotConsecutive => LegacyTemperatureBreachType::HotConsecutive,
        TemperatureBreachRowType::ColdCumulative => LegacyTemperatureBreachType::ColdCumulative,
        TemperatureBreachRowType::HotCumulative => LegacyTemperatureBreachType::HotCumulative,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_temperature_breach_translation() {
        use crate::sync::test::test_data::temperature_breach as test_data;
        let translator = TemperatureBreachTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_temperature_breach_translation",
            MockDataInserts::none(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
