use crate::sync::translations::store::StoreTranslation;

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType};
use repository::{
    ChangelogRow, ChangelogTableName, PreferenceRow, PreferenceRowDelete,
    StorageConnection, SyncBufferRow,
    Row,

};

pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(PreferenceTranslator)
}

pub(crate) struct PreferenceTranslator;
impl SyncTranslation for PreferenceTranslator {
    fn table_name(&self) -> &str {
        "preference"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![StoreTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::upsert(serde_json::from_value::<
            PreferenceRow,
        >(sync_record.data.0.clone())?))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Preference)
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
        let Row::Preference(preference_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = preference_row;
        Ok(PushTranslateResult::upsert(changelog, self.table_name(), serde_json::to_value(row)?))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(PreferenceRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};
    #[actix_rt::test]
    async fn test_preference_translation() {
        use crate::sync::test::test_data::preference as test_data;
        let translator = PreferenceTranslator;
        let (_, connection, _, _) =
            setup_all("test_preference_translation", MockDataInserts::none()).await;
        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();
            assert_eq!(translation_result, record.translated_record);
        }
    }
}
