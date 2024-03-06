use repository::{
    InventoryAdjustmentReasonRow, InventoryAdjustmentReasonRowDelete,
    InventoryAdjustmentReasonType, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyOptionsType {
    #[serde(rename = "positiveInventoryAdjustment")]
    Positive,
    #[serde(rename = "negativeInventoryAdjustment")]
    Negative,
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
    Box::new(InventoryAdjustmentReasonTranslation)
}

pub(super) struct InventoryAdjustmentReasonTranslation;
impl SyncTranslation for InventoryAdjustmentReasonTranslation {
    fn table_name(&self) -> &'static str {
        "options"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![]
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyOptionsRow>(&sync_record.data)?;

        let r#type = match data.r#type {
            LegacyOptionsType::Positive => InventoryAdjustmentReasonType::Positive,
            LegacyOptionsType::Negative => InventoryAdjustmentReasonType::Negative,
        };

        let result = InventoryAdjustmentReasonRow {
            id: data.id.to_string(),
            r#type,
            is_active: data.is_active,
            reason: data.reason,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    // TODO soft delete
    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(
            InventoryAdjustmentReasonRowDelete(sync_record.record_id.clone()),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_inventory_adjustment_reason_translation() {
        use crate::sync::test::test_data::inventory_adjustment_reason as test_data;
        let translator = InventoryAdjustmentReasonTranslation;

        let (_, connection, _, _) = setup_all(
            "test_inventory_adjustment_reason_translation",
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
