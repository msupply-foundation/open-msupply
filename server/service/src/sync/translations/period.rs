use chrono::NaiveDate;
use repository::{PeriodRow, StorageConnection, SyncBufferRow};
use serde::{Deserialize, Serialize};

use crate::sync::translations::period_schedule::PeriodScheduleTranslation;

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyPeriodRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "periodScheduleID")]
    pub period_schedule_id: String,
    #[serde(rename = "startDate")]
    pub start_date: NaiveDate,
    #[serde(rename = "endDate")]
    pub end_date: NaiveDate,
    pub name: String,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(PeriodTranslation)
}

pub(super) struct PeriodTranslation;
impl SyncTranslation for PeriodTranslation {
    fn table_name(&self) -> &str {
        "period"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![PeriodScheduleTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyPeriodRow {
            id,
            period_schedule_id,
            start_date,
            end_date,
            name,
        } = serde_json::from_str::<LegacyPeriodRow>(&sync_record.data)?;

        let result = PeriodRow {
            id,
            period_schedule_id,
            start_date,
            end_date,
            name,
        };

        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_period_translation() {
        use crate::sync::test::test_data::period as test_data;
        let translator = PeriodTranslation {};

        let (_, connection, _, _) =
            setup_all("test_period_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
