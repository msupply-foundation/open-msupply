use repository::{
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow, VaccinationRow,
    VaccinationRowRepository,
};

use crate::sync::translations::{
    clinician::ClinicianTranslation, document::DocumentTranslation,
    invoice_line::InvoiceLineTranslation, store::StoreTranslation, user::UserTranslation,
};

use super::{
    PullTranslateResult, PushTranslateResult, SyncTranslation, ToSyncRecordTranslationType,
};

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(VaccinationTranslation)
}

pub(crate) struct VaccinationTranslation;

impl SyncTranslation for VaccinationTranslation {
    fn table_name(&self) -> &'static str {
        "vaccination"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            DocumentTranslation.table_name(),
            UserTranslation.table_name(),
            ClinicianTranslation.table_name(),
            StoreTranslation.table_name(),
            InvoiceLineTranslation.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::upsert(serde_json::from_str::<
            VaccinationRow,
        >(&sync_record.data)?))
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::Vaccination)
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
        let row = VaccinationRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Vaccination row ({}) not found",
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
        use crate::sync::test::test_data::vaccination as test_data;
        let translator = VaccinationTranslation;

        let (_, connection, _, _) =
            setup_all("test_vaccination_translation", MockDataInserts::all()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
