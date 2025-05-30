use repository::{
    reason_option_row::{ReasonOptionRow, ReasonOptionRowDelete, ReasonOptionType},
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyOptionsType {
    #[serde(rename = "positiveInventoryAdjustment")]
    PositiveInventoryAdjustment,
    #[serde(rename = "negativeInventoryAdjustment")]
    NegativeInventoryAdjustment,
    #[serde(rename = "openVialWastage")]
    OpenVialWastage,
    #[serde(rename = "returnReason")]
    ReturnReason,
    #[serde(rename = "requisitionLineVariance")]
    RequisitionLineVariance,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyOptionsRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "type")]
    pub r#type: LegacyOptionsType,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "title")]
    pub reason: String,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(ReasonTranslation)
}

pub(super) struct ReasonTranslation;
impl SyncTranslation for ReasonTranslation {
    fn table_name(&self) -> &str {
        "options"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyOptionsRow>(&sync_record.data)?;

        let reason_option_type = match data.r#type {
            LegacyOptionsType::NegativeInventoryAdjustment => {
                ReasonOptionType::NegativeInventoryAdjustment
            }
            LegacyOptionsType::PositiveInventoryAdjustment => {
                ReasonOptionType::PositiveInventoryAdjustment
            }
            LegacyOptionsType::RequisitionLineVariance => ReasonOptionType::RequisitionLineVariance,
            LegacyOptionsType::ReturnReason => ReasonOptionType::ReturnReason,
            LegacyOptionsType::OpenVialWastage => ReasonOptionType::OpenVialWastage,
        };

        let result = PullTranslateResult::upsert(ReasonOptionRow {
            id: data.id.to_string(),
            r#type: reason_option_type,
            is_active: data.is_active,
            reason: data.reason,
        });

        Ok(result)
    }

    // TODO soft delete
    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(ReasonOptionRowDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_reason_translation() {
        use crate::sync::test::test_data::reason as test_data;
        let translator = ReasonTranslation;

        let (_, connection, _, _) =
            setup_all("test_reason_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
