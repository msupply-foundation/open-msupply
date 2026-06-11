use repository::{
    vaccine_course::vaccine_course_store_config_row::VaccineCourseStoreConfigRow, ChangelogRow,
    ChangelogTableName, Row, StorageConnection, SyncBufferRow,
};

use crate::sync::translations::vaccine_course::VaccineCourseTranslation;

use super::{
    store::StoreTranslation, FkField, PullTranslateResult, PushTranslateResult, SyncTranslation,
    ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(VaccineCourseStoreConfigTranslation)
}

pub(crate) struct VaccineCourseStoreConfigTranslation;

impl SyncTranslation for VaccineCourseStoreConfigTranslation {
    fn table_name(&self) -> &'static str {
        "vaccine_course_store_config"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            VaccineCourseTranslation.table_name(),
            StoreTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let mut row =
            serde_json::from_value::<VaccineCourseStoreConfigRow>(sync_record.data.0.clone())?;

        let check_fk =
            fk_checker.with_table_required(connection, "vaccine_course_store_config", &row.id);

        row.vaccine_course_id =
            check_fk(row.vaccine_course_id, "vaccine_course_id", FkField::VaccineCourse)?;
        row.store_id = check_fk(row.store_id, "store_id", FkField::Store)?;

        Ok(PullTranslateResult::upsert(row))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::VaccineCourseStoreConfig)
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
                // We shouldn't ever create VaccineCourseStoreConfig rows
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
        _connection: &StorageConnection,
        changelog: &ChangelogRow,
        row: Row,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Row::VaccineCourseStoreConfig(vaccine_course_store_config_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = vaccine_course_store_config_row;

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
    async fn test_vaccine_course_store_config_translation() {
        use crate::sync::test::test_data::vaccine_course_store_config as test_data;
        let translator = VaccineCourseStoreConfigTranslation;

        let (_, connection, _, _) = setup_all(
            "test_vaccine_course_store_config_translation",
            MockDataInserts::none(),
        )
        .await;

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
    }
}
