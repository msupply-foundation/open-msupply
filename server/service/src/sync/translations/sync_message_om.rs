use super::{
    store::StoreTranslation, PullTranslateResult, PushTranslateResult, SyncTranslation,
    ToSyncRecordTranslationType,
};
use repository::{
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow, SyncMessageRow,
    SyncMessageRowRepository,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(OmSyncMessageTranslation)
}

pub(crate) struct OmSyncMessageTranslation;

impl SyncTranslation for OmSyncMessageTranslation {
    fn table_name(&self) -> &str {
        "om_sync_message"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![StoreTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::upsert(serde_json::from_str::<
            SyncMessageRow,
        >(&sync_record.data)?))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::SyncMessage)
    }

    fn should_translate_to_sync_record(
        &self,
        row: &ChangelogRow,
        r#type: &ToSyncRecordTranslationType,
    ) -> bool {
        match r#type {
            ToSyncRecordTranslationType::PullFromOmSupplyCentral
            | ToSyncRecordTranslationType::PushToOmSupplyCentral => {
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
        let row = SyncMessageRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Sync message row ({}) not found",
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
    async fn test_om_sync_message_translation() {
        use crate::sync::test::test_data::sync_message_om as test_data;
        let translator = OmSyncMessageTranslation;

        let (_, connection, _, _) =
            setup_all("test_om_sync_message_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
