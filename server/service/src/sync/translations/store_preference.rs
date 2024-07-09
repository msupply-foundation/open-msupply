use repository::{StorageConnection, StorePreferenceRow, StorePreferenceType, SyncBufferRow};
use serde::{Deserialize, Serialize};

use crate::sync::sync_serde::string_to_f64;

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyOptionsType {
    #[serde(rename = "store_preferences")]
    StorePreferences,
    #[serde(other)]
    Others,
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
    #[serde(default)] // In case preference is missing, use default
    #[serde(rename = "default_item_packsize_to_one")]
    pub pack_to_one: bool,
    #[serde(default)]
    #[serde(rename = "shouldAuthoriseResponseRequisition")]
    pub response_requisition_requires_authorisation: bool,
    #[serde(default)]
    #[serde(rename = "includeRequisitionsInSuppliersRemoteAuthorisationProcesses")]
    pub request_requisition_requires_authorisation: bool,
    #[serde(default)]
    #[serde(rename = "omSupplyUsesProgramModule")]
    pub om_program_module: bool,
    #[serde(default)]
    #[serde(rename = "usesVaccineModule")]
    pub vaccine_module: bool,
    #[serde(default)]
    #[serde(rename = "can_issue_in_foreign_currency")]
    pub issue_in_foreign_currency: bool,
    #[serde(default)]
    #[serde(deserialize_with = "string_to_f64")]
    #[serde(rename = "monthlyConsumptionLookBackPeriod")]
    pub monthly_consumption_look_back_period: f64,
    #[serde(default)]
    #[serde(deserialize_with = "string_to_f64")]
    #[serde(rename = "monthsLeadTime")]
    pub months_lead_time: f64,
    #[serde(default)]
    #[serde(rename = "monthsOverstock")]
    pub months_overstock: f64,
    #[serde(default)]
    #[serde(rename = "monthsUnderstock")]
    pub months_understock: f64,
    #[serde(default)]
    #[serde(rename = "monthsItemsExpire")]
    pub months_items_expire: f64,
    #[serde(default)]
    #[serde(rename = "stocktakeFrequency")]
    pub stocktake_frequency: f64,
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
            LegacyOptionsType::Others => {
                return Ok(PullTranslateResult::Ignored(
                    "Unsupported pref type".to_string(),
                ));
            }
        };

        let LegacyPrefData {
            pack_to_one,
            response_requisition_requires_authorisation,
            request_requisition_requires_authorisation,
            om_program_module,
            vaccine_module,
            issue_in_foreign_currency,
            monthly_consumption_look_back_period,
            months_lead_time,
            months_overstock,
            months_understock,
            months_items_expire,
            stocktake_frequency,
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
            monthly_consumption_look_back_period,
            months_lead_time,
            months_overstock,
            months_understock,
            months_items_expire,
            stocktake_frequency,
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
