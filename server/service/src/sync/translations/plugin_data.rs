use repository::{
<<<<<<< HEAD
    ChangelogRow, ChangelogTableName, PluginDataRow, PluginDataRowDelete, Row, StorageConnection,
    SyncBufferRow,
=======
    ChangelogRow, ChangelogTableName, PluginDataRow, Row, StorageConnection, SyncBufferRow,
>>>>>>> 8c6410ebb5 (All fks checked)
};

use crate::sync::translations::store::StoreTranslation;

use super::{
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation,
    ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(PluginDataTranslator)
}

pub(crate) struct PluginDataTranslator;

impl SyncTranslation for PluginDataTranslator {
    fn table_name(&self) -> &str {
        "plugin_data"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![StoreTranslation.table_name()]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let row = serde_json::from_value::<PluginDataRow>(sync_record.data.0.clone())?;

        let fk_check = fk_checker.with_table(connection, "plugin_data", &row.id);

        let result = PluginDataRow {
            store_id: fk_check(row.store_id, "store_id", FkField::Store)?,
            ..row
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::PluginData)
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
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::PluginData(plugin_data_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = plugin_data_row;

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(row)?,
        ))
    }

    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(PluginDataRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_plugin_data_translation() {
        use crate::sync::test::test_data::plugin_data as test_data;
        let translator = PluginDataTranslator;

        let (_, connection, _, _) =
            setup_all("test_plugin_data_translation", MockDataInserts::none()).await;

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

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
