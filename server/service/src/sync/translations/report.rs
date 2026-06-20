use crate::sync::translations::om_form_schema::OmFormSchemaTranslation;

use super::{
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation,
    ToSyncRecordTranslationType,
};
use repository::{
    ChangelogRow, ChangelogTableName, ReportRow, Row, StorageConnection, SyncBufferRow,
};
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(OmReportTranslator)
}
pub(crate) struct OmReportTranslator;
impl SyncTranslation for OmReportTranslator {
    fn table_name(&self) -> &str {
        "om_report"
    }
    fn pull_dependencies(&self) -> Vec<&str> {
        vec![OmFormSchemaTranslation.table_name()]
    }
    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let row = serde_json::from_value::<ReportRow>(sync_record.data.0.clone())?;

        let fk_check = fk_checker.with_table(connection, "om_report", &row.id);

        let result = ReportRow {
            argument_schema_id: fk_check(
                row.argument_schema_id,
                "argument_schema_id",
                FkField::FormSchema,
            )?,
            ..row
        };

        Ok(PullTranslateResult::upsert(Row::Report(result)))
    }
    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Report)
    }
    // Only translating and pulling from central server
    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PullFromOmSupplyCentral => {
                self.change_log_type().as_ref() == Some(&row.table_name)
            }
            _ => false,
        }
    }
    fn try_translate_to_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::Report(report_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = report_row;
        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(row)?,
        ))
    }
    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(
            ChangelogTableName::Report,
            sync_record.record_id.clone(),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};
    #[actix_rt::test]
    async fn test_report_translation() {
        use crate::sync::test::test_data::om_report as test_data;
        let translator = OmReportTranslator;
        let (_, connection, _, _) =
            setup_all("test_report_translation", MockDataInserts::none()).await;
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
