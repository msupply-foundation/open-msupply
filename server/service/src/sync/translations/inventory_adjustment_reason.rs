use repository::{
    InventoryAdjustmentReasonRow, InventoryAdjustmentReasonType, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{
    IntegrationRecords, LegacyTableName, PullDeleteRecordTable, PullUpsertRecord, SyncTranslation,
};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::INVENTORY_ADJUSTMENT_REASON;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}

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

pub(crate) struct InventoryAdjustmentReasonTranslation {}
impl SyncTranslation for InventoryAdjustmentReasonTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

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

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::InventoryAdjustmentReason(result),
        )))
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let result = match_pull_table(sync_record).then(|| {
            IntegrationRecords::from_delete(
                &sync_record.record_id,
                PullDeleteRecordTable::InventoryAdjustmentReason,
            )
        });

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_inventory_adjustment_reason_translation() {
        use crate::sync::test::test_data::inventory_adjustment_reason as test_data;
        let translator = InventoryAdjustmentReasonTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_inventory_adjustment_reason_translation",
            MockDataInserts::none(),
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
