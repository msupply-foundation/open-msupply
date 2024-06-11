use repository::{
    ChangelogRow, ChangelogTableName, NameOmsFieldsRow, NameRowRepository, StorageConnection,
    SyncBufferRow,
};

use crate::sync::translations::name::NameTranslation;

use super::{
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NameOmsFieldsTranslation)
}

pub(super) struct NameOmsFieldsTranslation;
impl SyncTranslation for NameOmsFieldsTranslation {
    fn table_name(&self) -> &str {
        "name_oms_fields"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![NameTranslation.table_name()]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::NameOmsFields)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let upsert_record = PullTranslateResult::upsert(serde_json::from_str::<NameOmsFieldsRow>(
            &sync_record.data,
        )?);
        Ok(upsert_record)
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
        let row = NameRowRepository::new(connection)
            .find_one_oms_fields_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Name row ({}) not found for Name OMS Fields translation",
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
    async fn test_name_oms_fields_translation() {
        use crate::sync::test::test_data::name_oms_fields as test_data;
        let translator = NameOmsFieldsTranslation {};

        let (_, connection, _, _) =
            setup_all("test_name_oms_fields_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
