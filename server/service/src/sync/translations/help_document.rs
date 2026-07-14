use repository::{
    help_document_row::{HelpDocumentRow, HelpDocumentRowRepository},
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
};

use super::{
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(HelpDocumentTranslation)
}

pub(super) struct HelpDocumentTranslation;

impl SyncTranslation for HelpDocumentTranslation {
    fn table_name(&self) -> &str {
        "help_document"
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
            HelpDocumentRow,
        >(&sync_record.data)?))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::HelpDocument)
    }

    // Help documents are uploaded on central and pushed to every remote.
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
        let row = HelpDocumentRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "HelpDocument row ({}) not found",
                changelog.record_id
            )))?;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(row)?,
        ))
    }
}
