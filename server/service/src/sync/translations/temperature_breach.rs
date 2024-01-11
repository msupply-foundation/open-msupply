use crate::sync::{
    api::RemoteSyncRecordV5,
    sync_serde::{
        date_from_date_time, date_option_to_isostring, empty_str_as_option,
        empty_str_as_option_string, naive_time, zero_date_as_option,
    },
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
    Excursion,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyTemperatureBreachRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "duration")]
    pub duration_milliseconds: i32,
    #[serde(rename = "type")]
    pub r#type: LegacyTemperatureBreachType,
    #[serde(rename = "sensor_ID")]
    pub sensor_id: String,
    #[serde(rename = "location_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub location_id: Option<String>,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub start_date: Option<NaiveDate>,
    #[serde(deserialize_with = "naive_time")]
    pub start_time: NaiveTime,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub end_date: Option<NaiveDate>,
    #[serde(deserialize_with = "naive_time")]
    pub end_time: NaiveTime,
    pub acknowledged: bool,
    #[serde(rename = "threshold_minimum_temperature")]
    pub threshold_minimum: f64,
    #[serde(rename = "threshold_maximum_temperature")]
    pub threshold_maximum: f64,
    #[serde(rename = "threshold_duration")]
    pub threshold_duration_milliseconds: i32,
    #[serde(rename = "om_end_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub end_datetime: Option<NaiveDateTime>,
    #[serde(rename = "om_start_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub start_datetime: Option<NaiveDateTime>,
}

pub(crate) struct TemperatureBreachTranslation {}
impl SyncTranslation for TemperatureBreachTranslation {
    fn pull_dependencies(&self) -> PullDependency {
        PullDependency {
            table: LegacyTableName::TEMPERATURE_BREACH,
            dependencies: vec![
                LegacyTableName::STORE,
                LegacyTableName::LOCATION,
                LegacyTableName::SENSOR,
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
        let LegacyTemperatureBreachRow {
            id,
            duration_milliseconds,
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
            threshold_duration_milliseconds,
            end_datetime,
            start_datetime,
        } = data;

        let r#type = from_legacy_breach_type(&r#type);
        let result = TemperatureBreachRow {
            id,
            duration_milliseconds,
            r#type,
            sensor_id,
            location_id,
            store_id,
            end_datetime: end_datetime.or(end_date.map(|date| NaiveDateTime::new(date, end_time))),
            unacknowledged: !acknowledged,
            threshold_minimum,
            threshold_maximum,
            threshold_duration_milliseconds,
            start_datetime: start_datetime
                .or(start_date.map(|date| NaiveDateTime::new(date, start_time)))
                .unwrap(),
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
            duration_milliseconds,
            r#type,
            sensor_id,
            location_id,
            store_id,
            start_datetime,
            end_datetime,
            unacknowledged,
            threshold_minimum,
            threshold_maximum,
            threshold_duration_milliseconds,
        } = TemperatureBreachRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "TemperatureBreach row ({}) not found",
                changelog.record_id
            )))?;

        let r#type = to_legacy_breach_type(&r#type);

        let legacy_row = LegacyTemperatureBreachRow {
            id,
            duration_milliseconds,
            r#type,
            sensor_id,
            location_id,
            store_id,
            start_date: Some(start_datetime.date()),
            start_time: start_datetime.time(),
            end_date: end_datetime.map(|end_datetime| date_from_date_time(&end_datetime)),
            end_time: end_datetime
                .map(|datetime| datetime.time())
                .unwrap_or(NaiveTime::from_hms_opt(0, 0, 0).unwrap()),
            acknowledged: !unacknowledged,
            threshold_minimum,
            threshold_maximum,
            threshold_duration_milliseconds,
            start_datetime: Some(start_datetime),
            end_datetime,
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
        LegacyTemperatureBreachType::Excursion => TemperatureBreachRowType::Excursion,
    }
}

pub fn to_legacy_breach_type(t: &TemperatureBreachRowType) -> LegacyTemperatureBreachType {
    match t {
        TemperatureBreachRowType::ColdConsecutive => LegacyTemperatureBreachType::ColdConsecutive,
        TemperatureBreachRowType::HotConsecutive => LegacyTemperatureBreachType::HotConsecutive,
        TemperatureBreachRowType::ColdCumulative => LegacyTemperatureBreachType::ColdCumulative,
        TemperatureBreachRowType::HotCumulative => LegacyTemperatureBreachType::HotCumulative,
        TemperatureBreachRowType::Excursion => LegacyTemperatureBreachType::Excursion,
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
