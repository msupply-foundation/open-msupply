use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use repository::{
    ChangelogRow, ChangelogTableName, LocationMovementRow, LocationMovementRowRepository,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use crate::sync::{
    api::RemoteSyncRecordV5,
    sync_serde::{
        date_option_to_isostring, empty_str_as_option_string, naive_time, zero_date_as_option,
    },
};

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::LOCATION_MOVEMENT;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::LocationMovement
}

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

pub(crate) struct LocationMovementTranslation {}
impl SyncTranslation for LocationMovementTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

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

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::LocationMovement(result),
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

        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LEGACY_TABLE_NAME,
            serde_json::to_value(&legacy_row)?,
        )]))
    }

    fn try_translate_push_delete(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        let result = match_push_table(changelog)
            .then(|| vec![RemoteSyncRecordV5::new_delete(changelog, LEGACY_TABLE_NAME)]);

        Ok(result)
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
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
