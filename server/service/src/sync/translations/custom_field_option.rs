use repository::{
    ChangelogRow, ChangelogTableName, CustomFieldOptionRow, Row, StorageConnection, SyncBufferRow,
};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType};

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(CustomFieldOptionTranslation)
}

pub(crate) struct CustomFieldOptionTranslation;

impl SyncTranslation for CustomFieldOptionTranslation {
    fn table_name(&self) -> &str {
        "custom_field_option"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec!["custom_field"]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::upsert(serde_json::from_value::<
            CustomFieldOptionRow,
        >(
            sync_record.data.0.clone()
        )?))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::CustomFieldOption)
    }

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
        let Row::CustomFieldOption(option_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(option_row)?,
        ))
    }
}
