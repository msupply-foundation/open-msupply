use crate::sync::sync_serde::zero_date_as_option;
use chrono::NaiveDate;
use repository::{DiagnosisRow, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyDiagnosisRow {
    pub ID: String,
    pub ICD_CODE: String,
    pub ICD_DESCRIPTION: String,
    pub NOTES: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    pub VALID_TILL: Option<NaiveDate>,
}

// Needs to be added to all_translators()
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(DiagnosisTranslation)
}

pub(super) struct DiagnosisTranslation;
impl SyncTranslation for DiagnosisTranslation {
    fn table_name(&self) -> &str {
        "diagnosis"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyDiagnosisRow>(&sync_record.data)?;
        let result = DiagnosisRow {
            id: data.ID,
            code: data.ICD_CODE,
            description: data.ICD_DESCRIPTION,
            notes: data.NOTES,
            valid_till: data.VALID_TILL,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        _sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // There's not delete functionality for diagnosis in mSupply currently.
        log::error!("Deleting diagnosis is not supported");
        Ok(PullTranslateResult::NotMatched)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_diagnosis_translation() {
        use crate::sync::test::test_data::diagnosis as test_data;
        let translator = DiagnosisTranslation {};

        let (_, connection, _, _) =
            setup_all("test_diagnosis_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
