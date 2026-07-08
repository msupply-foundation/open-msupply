use chrono::NaiveDate;
use repository::{PeriodRow, StorageConnection, SyncBufferRow};
use serde::{Deserialize, Serialize};

use crate::sync::translations::period_schedule::PeriodScheduleTranslation;

use super::{FkField, PullTranslateResult, SyncTranslation};

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
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyPeriodRow {
            id,
            period_schedule_id,
            start_date,
            end_date,
            name,
        } = sync_record.deserialize()?;

        let check_fk = fk_checker.with_table_required(connection, "period", &id);

        let result = PeriodRow {
            id,
            period_schedule_id: check_fk(
                period_schedule_id,
                "period_schedule_id",
                FkField::PeriodSchedule,
            )?,
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
    use repository::{
        mock::MockDataInserts, test_db::setup_all, PeriodScheduleRow, PeriodScheduleRowRepository,
    };

    #[actix_rt::test]
    async fn test_period_translation() {
        use crate::sync::test::test_data::period as test_data;
        let translator = PeriodTranslation {};

        let (_, connection, _, _) =
            setup_all("test_period_translation", MockDataInserts::all()).await;

        // Seed the period_schedule parents the periods' required FKs point at.
        for schedule_id in [
            "period_schedule_1",
            "period_schedule_2",
            "597074CBCCC24166B8C1F82553DACC2F",
        ] {
            PeriodScheduleRowRepository::new(&connection)
                .upsert_one(&PeriodScheduleRow {
                    id: schedule_id.to_string(),
                    name: "test".to_string(),
                })
                .unwrap();
        }

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(
                    &connection,
                    &crate::sync::translations::FkChecker::new(),
                    &record.sync_buffer_row,
                )
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
