use super::{
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};
use repository::{
    ChangelogRow, ChangelogTableName, FormSchemaJson, FormSchemaRowDelete, FormSchemaRowRepository,
    StorageConnection, SyncBufferRow,
};
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(OmFormSchemaTranslation)
}
pub(crate) struct OmFormSchemaTranslation;
impl SyncTranslation for OmFormSchemaTranslation {
    fn table_name(&self) -> &str {
        "om_form_schema" // TODO should this be just form_schema? identifier is om_form_schema
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
            FormSchemaJson,
        >(&sync_record.data)?))
    }
    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::FormSchema)
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
        let row = FormSchemaRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Om form schema row ({}) not found",
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
        Ok(PullTranslateResult::delete(FormSchemaRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};
    #[actix_rt::test]
    async fn test_om_form_schema_translation() {
        use crate::sync::test::test_data::om_form_schema as test_data;
        let translator = OmFormSchemaTranslation;
        let (_, connection, _, _) =
            setup_all("test_om_form_schema_translation", MockDataInserts::none()).await;
        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();
            assert_eq!(translation_result, record.translated_record);
        }
    }
}
