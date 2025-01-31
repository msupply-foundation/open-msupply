use repository::{InsuranceProviderRow, StorageConnection, SyncBufferRow};

use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize)]
pub struct LegacyInsuranceProvider {
    #[serde(rename = "ID")]
    id: String,
    comment: Option<String>,
    #[serde(rename = "isActive")]
    is_active: bool,
    #[serde(rename = "providerName")]
    provider_name: String,
    #[serde(rename = "prescriptionValidityDays")]
    prescription_validity_days: Option<i32>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(InsuranceProviderTranslator)
}

pub(crate) struct InsuranceProviderTranslator;

impl SyncTranslation for InsuranceProviderTranslator {
    fn table_name(&self) -> &str {
        "insuranceProvider"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        println!(
            "Translating insurance provider record: {}",
            sync_record.data
        );

        let LegacyInsuranceProvider {
            id,
            comment,
            is_active,
            provider_name,
            prescription_validity_days,
        } = serde_json::from_str(&sync_record.data)?;

        // Translate the record directly here, don't need to look up the old record first
        let result = InsuranceProviderRow {
            id,
            comment,
            is_active,
            provider_name,
            prescription_validity_days,
        };

        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_insurance_provider_translation() {
        use crate::sync::test::test_data::insurance_provider as test_data;
        let translator = InsuranceProviderTranslator;

        let (_, connection, _, _) = setup_all(
            "test_insurance_provider_translation",
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
