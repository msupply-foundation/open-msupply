use repository::{
    vaccine_course::vaccine_course_store_wastage_row::{
        VaccineCourseStoreWastageRow, VaccineCourseStoreWastageRowRepository,
    },
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
};

use crate::sync::translations::vaccine_course::VaccineCourseTranslation;

use super::{
    store::StoreTranslation, PullTranslateResult, PushTranslateResult, SyncTranslation,
    ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(VaccineCourseStoreWastageTranslation)
}

pub(crate) struct VaccineCourseStoreWastageTranslation;

impl SyncTranslation for VaccineCourseStoreWastageTranslation {
    fn table_name(&self) -> &'static str {
        "vaccine_course_store_wastage"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            VaccineCourseTranslation.table_name(),
            StoreTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::upsert(serde_json::from_str::<
            VaccineCourseStoreWastageRow,
        >(&sync_record.data)?))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::VaccineCourseStoreWastage)
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
                // We shouldn't ever create VaccineCourseStoreWastage rows
                // outside of the central server, so we don't translate this, even when changelog records might exist
                // This can happen due to migrations that recreate change log
                // rows
                false
            }
            _ => false,
        }
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let row = VaccineCourseStoreWastageRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "VaccineCourseStoreWastage row ({}) not found",
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
    async fn test_vaccine_course_store_wastage_translation() {
        use crate::sync::test::test_data::vaccine_course_store_wastage as test_data;
        let translator = VaccineCourseStoreWastageTranslation;

        let (_, connection, _, _) = setup_all(
            "test_vaccine_course_store_wastage_translation",
            MockDataInserts::none(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
