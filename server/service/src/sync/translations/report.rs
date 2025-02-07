use super::{
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};
use repository::{
    ChangelogRow, ChangelogTableName, ReportRow, ReportRowDelete, ReportRowRepository,
    StorageConnection, SyncBufferRow,
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
        vec![]
    }
    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::upsert(serde_json::from_str::<
            ReportRow,
        >(&sync_record.data)?))
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
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let row = ReportRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Om report row ({}) not found",
                changelog.record_id
            )))?;
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
        Ok(PullTranslateResult::delete(ReportRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}
