use repository::{
    rnr_form_line_row::{RnRFormLineRow, RnRFormLineRowRepository},
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{item::ItemTranslation, rnr_form::RnRFormTranslation};

use super::{
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(RnRFormLineTranslation)
}

pub(crate) struct RnRFormLineTranslation;

impl SyncTranslation for RnRFormLineTranslation {
    fn table_name(&self) -> &'static str {
        "rnr_form_line"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            RnRFormTranslation.table_name(),
            ItemTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::upsert(serde_json::from_str::<
            RnRFormLineRow,
        >(&sync_record.data)?))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::RnrFormLine)
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
            ToSyncRecordTranslationType::PushToOmSupplyCentral => {
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
        let row = RnRFormLineRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "RnRFormLine row ({}) not found",
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
    async fn test_rnr_form_translation() {
        use crate::sync::test::test_data::rnr_form_line as test_data;
        let translator = RnRFormLineTranslation;

        let (_, connection, _, _) =
            setup_all("test_rnr_form_line_translation", MockDataInserts::all()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
