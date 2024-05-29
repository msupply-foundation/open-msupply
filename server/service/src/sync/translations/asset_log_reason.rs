use repository::{
    asset_log_reason_row::{AssetLogReasonRow, AssetLogReasonRowRepository},
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
};

use super::{
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(AssetLogReasonTranslation)
}

pub(crate) struct AssetLogReasonTranslation;

impl SyncTranslation for AssetLogReasonTranslation {
    fn table_name(&self) -> &str {
        "asset_log_reason"
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
            AssetLogReasonRow,
        >(&sync_record.data)?))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::AssetLogReason)
    }

    // Only translating and pulling from central server
    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PullFromOmSupplyCentralV6 => {
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
        let row = AssetLogReasonRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "AssetLogReason row ({}) not found",
                changelog.record_id
            )))?;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(row)?,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_asset_log_reason_translation() {
        use crate::sync::test::test_data::asset_log_reason as test_data;
        let translator = AssetLogReasonTranslation;

        let (_, connection, _, _) =
            setup_all("test_asset_log_reason_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
