use repository::{StorageConnection, StorePreferenceRow, StorePreferenceType, SyncBufferRow};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyOptionsType {
    #[serde(rename = "store_preferences")]
    StorePreferences,
}
#[derive(Deserialize, Serialize, Debug)]
pub struct LegacyPrefRow {
    #[serde(rename = "store_ID")]
    pub id: String,
    #[serde(rename = "item")]
    pub r#type: LegacyOptionsType,
    pub data: LegacyPrefData,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct LegacyPrefData {
    #[serde(rename = "default_item_packsize_to_one")]
    pub pack_to_one: bool,
    #[serde(rename = "shouldAuthoriseResponseRequisition")]
    pub response_requisition_requires_authorisation: bool,
    #[serde(rename = "includeRequisitionsInSuppliersRemoteAuthorisationProcesses")]
    pub request_requisition_requires_authorisation: bool,
    #[serde(default)]
    // In case preference is missing, use default
    #[serde(rename = "omSupplyUsesProgramModule")]
    pub om_program_module: bool,
    #[serde(rename = "usesVaccineModule")]
    pub vaccine_module: bool,
    #[serde(rename = "can_issue_in_foreign_currency")]
    pub issue_in_foreign_currency: bool,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(StorePreferenceTranslation)
}

pub(super) struct StorePreferenceTranslation;
impl SyncTranslation for StorePreferenceTranslation {
    fn table_name(&self) -> &str {
        "pref"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyPrefRow>(&sync_record.data)?;

        let LegacyPrefRow { id, r#type, data } = data;

        let r#type = match r#type {
            LegacyOptionsType::StorePreferences => StorePreferenceType::StorePreferences,
        };

        let LegacyPrefData {
            pack_to_one,
            response_requisition_requires_authorisation,
            request_requisition_requires_authorisation,
            om_program_module,
            vaccine_module,
            issue_in_foreign_currency,
        } = data;

        let result = StorePreferenceRow {
            id,
            r#type,
            pack_to_one,
            response_requisition_requires_authorisation,
            request_requisition_requires_authorisation,
            om_program_module,
            vaccine_module,
            issue_in_foreign_currency,
        };

        Ok(PullTranslateResult::upsert(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_store_preference_translation() {
        use crate::sync::test::test_data::store_preference as test_data;
        let translator = StorePreferenceTranslation {};

        let (_, connection, _, _) =
            setup_all("test_store_preference_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
