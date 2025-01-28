use crate::sync::{
    sync_serde::{
        date_from_date_time, date_option_to_isostring, empty_str_as_option,
        empty_str_as_option_string, naive_time, zero_date_as_option,
    },
    translations::{
        location::LocationTranslation, sensor::SensorTranslation, store::StoreTranslation,
    },
};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};

use repository::{
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow, TemperatureBreachRow,
    TemperatureBreachRowRepository, TemperatureBreachRowType,
};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

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
    #[serde(rename = "om_comment")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub comment: Option<String>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(TemperatureBreachTranslation)
}

pub(crate) struct TemperatureBreachTranslation;
impl SyncTranslation for TemperatureBreachTranslation {
    fn table_name(&self) -> &str {
        "temperature_breach"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            SensorTranslation.table_name(),
            StoreTranslation.table_name(),
            LocationTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::TemperatureBreach)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
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
            comment,
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
            comment,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
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
            comment,
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
            comment,
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
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
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
