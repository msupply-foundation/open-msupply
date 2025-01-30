use repository::{name_insurance_join_row::NameInsuranceJoinRow, StorageConnection, SyncBufferRow};

use serde::Deserialize;

use crate::sync::translations::{
    insurance_provider::InsuranceProviderTranslator, name::NameTranslation,
};

use super::{PullTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyNameInsuranceJoinRow {
    ID: String,
    name_ID: String,
    name_insurance_ID: String,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(NameInsuranceJoinTranslation)
}

pub(super) struct NameInsuranceJoinTranslation;
impl SyncTranslation for NameInsuranceJoinTranslation {
    fn table_name(&self) -> &str {
        "nameInsuranceJoin"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            NameTranslation.table_name(),
            InsuranceProviderTranslator.table_name(),
        ]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyNameInsuranceJoinRow {
            ID,
            name_ID,
            name_insurance_ID,
        } = serde_json::from_str::<LegacyNameInsuranceJoinRow>(&sync_record.data)?;
        if name_ID.is_empty() {
            return Ok(PullTranslateResult::Ignored("Name id is empty".to_string()));
        }

        let result = NameInsuranceJoinRow {
            id: ID,
            name_id: name_ID,
            insurance_provider_id: String::new(),
            policy_number_person: None,
            policy_number_family: None,
            policy_number: String::new(),
            policy_type: InsurancePolicyType::default(),
            discount_percentage: 0,
            expiry_date: NaiveDate::default(),
            is_active: false,
            entered_by_id: String::new(),
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
            &self,
            _: &StorageConnection,
            _: &repository::ChangelogRow,
        ) -> Result<super::PushTranslateResult, anyhow::Error> {
    
            todo!("NameInsuranceJoinTranslation is not implemented for upsert YET!")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_name_insurance_join_translation() {
        use crate::sync::test::test_data::name_insurance_join as test_data;
        let translator = NameInsuranceJoinTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_name_insurance_join_translation",
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
