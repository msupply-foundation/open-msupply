use repository::{
    vaccine_course::vaccine_course_item_row::VaccineCourseItemRow, ChangelogRow,
    ChangelogTableName, Row, StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{item::ItemTranslation, vaccine_course::VaccineCourseTranslation};

use super::{
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(VaccineCourseItemTranslation)
}

pub(crate) struct VaccineCourseItemTranslation;

impl SyncTranslation for VaccineCourseItemTranslation {
    fn table_name(&self) -> &'static str {
        "vaccine_course_item"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            VaccineCourseTranslation.table_name(),
            ItemTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let mut row = serde_json::from_value::<VaccineCourseItemRow>(sync_record.data.0.clone())?;

        let check_fk = fk_checker.with_table_required(connection, "vaccine_course_item", &row.id);

        row.vaccine_course_id =
            check_fk(row.vaccine_course_id, "vaccine_course_id", FkField::VaccineCourse)?;
        row.item_link_id = check_fk(row.item_link_id, "item_link_id", FkField::ItemLink)?;

        Ok(PullTranslateResult::upsert(Row::VaccineCourseItem(row)))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::VaccineCourseItem)
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
                // We shouldn't ever create Vaccine Course item rows in the central server,
                // so we don't translate this, even when changelog records might exist
                // This can happen due to migrations that recreate change log rows
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
        let Row::VaccineCourseItem(vaccine_course_item_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = vaccine_course_item_row;

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
    async fn test_vaccine_course_item_translation() {
        use crate::sync::test::test_data::vaccine_course_item as test_data;
        let translator = VaccineCourseItemTranslation;

        let (_, connection, _, _) = setup_all(
            "test_vaccine_course_item_translation",
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
