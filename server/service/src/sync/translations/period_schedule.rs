use repository::{PeriodScheduleRow, StorageConnection, SyncBufferRow};
use serde::{Deserialize, Serialize};

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::PERIOD_SCHEDULE;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyPeriodScheduleRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub name: String,
}

pub(crate) struct PeriodScheduleTranslation {}
impl SyncTranslation for PeriodScheduleTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let LegacyPeriodScheduleRow { id, name } =
            serde_json::from_str::<LegacyPeriodScheduleRow>(&sync_record.data)?;

        let result = PeriodScheduleRow { id, name };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::PeriodSchedule(result),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_period_schedule_translation() {
        use crate::sync::test::test_data::period_schedule as test_data;
        let translator = PeriodScheduleTranslation {};

        let (_, connection, _, _) =
            setup_all("test_period_schedule_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
