use repository::{
    rnr_form_row::RnRFormRow, ChangelogRow, ChangelogTableName, RnRFormDelete, Row,
    StorageConnection, SyncBufferRow,
};

use crate::sync::translations::{
    master_list::MasterListTranslation, name::NameTranslation, period::PeriodTranslation,
    program_requisition_settings::ProgramRequisitionSettingsTranslation,
    requisition::RequisitionTranslation, store::StoreTranslation,
};

use super::{
    FkField, PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(RnRFormTranslation)
}

pub(crate) struct RnRFormTranslation;

impl SyncTranslation for RnRFormTranslation {
    fn table_name(&self) -> &'static str {
        "rnr_form"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            MasterListTranslation.table_name(),
            ProgramRequisitionSettingsTranslation.table_name(),
            PeriodTranslation.table_name(),
            StoreTranslation.table_name(),
            NameTranslation.table_name(),
            RequisitionTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        fk_checker: &crate::sync::translations::FkChecker,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let row = serde_json::from_value::<RnRFormRow>(sync_record.data.0.clone())?;

        let check_fk = fk_checker.with_table_required(connection, "rnr_form", &row.id);

        let result = RnRFormRow {
            name_id: check_fk(row.name_id, "name_link_id", FkField::NameLink)?,
            store_id: check_fk(row.store_id, "store_id", FkField::Store)?,
            period_id: check_fk(row.period_id, "period_id", FkField::Period)?,
            program_id: check_fk(row.program_id, "program_id", FkField::Program)?,
            ..row
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::RnrForm)
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
        let Row::RnrForm(rnr_form_row) = row else {
            return Ok(PushTranslateResult::NotMatched);
        };

        let row = rnr_form_row;

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
        Ok(PullTranslateResult::delete(RnRFormDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_rnr_form_translation() {
        use crate::sync::test::test_data::rnr_form as test_data;
        let translator = RnRFormTranslation;

        let (_, connection, _, _) =
            setup_all("test_rnr_form_translation", MockDataInserts::all()).await;

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
