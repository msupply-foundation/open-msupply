use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use repository::{
    ChangelogRow, ChangelogTableName, LocationMovementRow, LocationMovementRowRepository,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::{
    sync_serde::{
        date_option_to_isostring, empty_str_as_option_string, naive_time, zero_date_as_option,
    },
    translations::{
        location::LocationTranslation, stock_line::StockLineTranslation, store::StoreTranslation,
    },
};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyLocationMovementRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    #[serde(rename = "item_line_ID")]
    pub stock_line_id: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "location_ID")]
    pub location_id: Option<String>,

    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub enter_date: Option<NaiveDate>,
    #[serde(deserialize_with = "naive_time")]
    pub enter_time: NaiveTime,

    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub exit_date: Option<NaiveDate>,
    #[serde(deserialize_with = "naive_time")]
    pub exit_time: NaiveTime,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(LocationMovementTranslation)
}

pub(super) struct LocationMovementTranslation;
impl SyncTranslation for LocationMovementTranslation {
    fn table_name(&self) -> &str {
        "location_movement"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            StoreTranslation.table_name(),
            LocationTranslation.table_name(),
            StockLineTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::LocationMovement)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyLocationMovementRow {
            id,
            store_id,
            stock_line_id,
            location_id,
            enter_date,
            enter_time,
            exit_date,
            exit_time,
        } = serde_json::from_str::<LegacyLocationMovementRow>(&sync_record.data)?;

        let result = LocationMovementRow {
            id,
            store_id,
            stock_line_id,
            location_id,
            enter_datetime: enter_date.map(|enter_date| NaiveDateTime::new(enter_date, enter_time)),
            exit_datetime: exit_date.map(|exit_date| NaiveDateTime::new(exit_date, exit_time)),
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let LocationMovementRow {
            id,
            store_id,
            stock_line_id,
            location_id,
            enter_datetime,
            exit_datetime,
        } = LocationMovementRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Location movement row ({}) not found",
                changelog.record_id
            )))?;

        let legacy_row = LegacyLocationMovementRow {
            id: id.clone(),
            store_id: store_id,
            stock_line_id,
            location_id,
            enter_date: enter_datetime.map(|datetime| datetime.date()),
            enter_time: enter_datetime
                .map(|datetime| datetime.time())
                .unwrap_or(NaiveTime::from_hms_opt(0, 0, 0).unwrap()),
            exit_date: exit_datetime.map(|datetime| datetime.date()),
            exit_time: exit_datetime
                .map(|datetime| datetime.time())
                .unwrap_or(NaiveTime::from_hms_opt(0, 0, 0).unwrap()),
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
    async fn test_location_translation() {
        use crate::sync::test::test_data::location_movement as test_data;
        let translator = LocationMovementTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_location_movement_translation",
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
