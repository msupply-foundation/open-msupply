use repository::{PeriodScheduleRow, StorageConnection, SyncBufferRow};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyPeriodScheduleRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub name: String,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(PeriodScheduleTranslation)
}

pub(super) struct PeriodScheduleTranslation;
impl SyncTranslation for PeriodScheduleTranslation {
    fn table_name(&self) -> &'static str {
        "periodSchedule"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyPeriodScheduleRow { id, name } =
            serde_json::from_str::<LegacyPeriodScheduleRow>(&sync_record.data)?;

        let result = PeriodScheduleRow { id, name };

        Ok(PullTranslateResult::upsert(result))
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
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
