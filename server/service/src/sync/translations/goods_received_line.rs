use crate::sync::translations::{
    goods_received::GoodsReceivedTranslation, item::ItemTranslation, location::LocationTranslation,
    name::NameTranslation, purchase_order::PurchaseOrderTranslation, PullTranslateResult,
    PushTranslateResult, SyncTranslation,
};
use chrono::NaiveDate;
use repository::{
    ChangelogRow, ChangelogTableName, GoodsReceivedLineDelete, GoodsReceivedLineRow,
    GoodsReceivedLineRowRepository, GoodsReceivedLineStatus, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{
    date_option_to_isostring, empty_str_as_option_string, zero_date_as_option, zero_f64_as_none,
};
#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct LegacyGoodsReceivedLineRow {
    pub ID: String,
    pub goods_received_ID: String,
    pub order_line_ID: String,
    pub pack_received: f64,
    pub quantity_received: f64,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub batch_received: Option<String>,
    pub weight_per_pack: Option<f64>,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub expiry_date: Option<NaiveDate>,
    pub line_number: i64,
    pub item_ID: String,
    pub item_name: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub location_ID: Option<String>,
    #[serde(deserialize_with = "zero_f64_as_none")]
    pub volume_per_pack: Option<f64>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub manufacturer_ID: Option<String>,
    pub is_authorised: bool,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub comment: Option<String>,
}

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(GoodsReceivedLineTranslation)
}

pub(super) struct GoodsReceivedLineTranslation;

impl SyncTranslation for GoodsReceivedLineTranslation {
    fn table_name(&self) -> &str {
        "Goods_received_line"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            GoodsReceivedTranslation.table_name(),
            PurchaseOrderTranslation.table_name(),
            ItemTranslation.table_name(),
            LocationTranslation.table_name(),
            NameTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::GoodsReceivedLine)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let legacy_row = serde_json::from_str::<LegacyGoodsReceivedLineRow>(&sync_record.data)?;
        let result = GoodsReceivedLineRow {
            id: legacy_row.ID,
            goods_received_id: legacy_row.goods_received_ID,
            purchase_order_line_id: legacy_row.order_line_ID,
            received_pack_size: legacy_row.pack_received,
            number_of_packs_received: legacy_row.quantity_received,
            batch: legacy_row.batch_received,
            weight_per_pack: legacy_row.weight_per_pack,
            expiry_date: legacy_row.expiry_date,
            line_number: legacy_row.line_number,
            item_link_id: legacy_row.item_ID,
            item_name: legacy_row.item_name,
            location_id: legacy_row.location_ID,
            volume_per_pack: legacy_row.volume_per_pack,
            manufacturer_id: legacy_row.manufacturer_ID,
            status: match legacy_row.is_authorised {
                true => GoodsReceivedLineStatus::Authorised,
                false => GoodsReceivedLineStatus::Unauthorised,
            },
            comment: legacy_row.comment,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(GoodsReceivedLineDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let row = GoodsReceivedLineRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or_else(|| {
                anyhow::anyhow!(
                    "Goods Received Line with ID {} not found",
                    changelog.record_id
                )
            })?;

        let legacy_row = LegacyGoodsReceivedLineRow {
            ID: row.id,
            goods_received_ID: row.goods_received_id,
            order_line_ID: row.purchase_order_line_id,
            pack_received: row.received_pack_size,
            quantity_received: row.number_of_packs_received,
            batch_received: row.batch,
            weight_per_pack: row.weight_per_pack,
            expiry_date: row.expiry_date,
            line_number: row.line_number,
            item_ID: row.item_link_id,
            item_name: row.item_name,
            location_ID: row.location_id,
            volume_per_pack: row.volume_per_pack,
            manufacturer_ID: row.manufacturer_id,
            is_authorised: match row.status {
                GoodsReceivedLineStatus::Authorised => true,
                GoodsReceivedLineStatus::Unauthorised => false,
            },
            comment: row.comment,
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }

    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }
}

#[cfg(test)]
mod tests {

    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_goods_received_line_translation() {
        use crate::sync::test::test_data::goods_received_line as test_data;
        let translator = GoodsReceivedLineTranslation {};

        let (_, connection, _, _) = setup_all(
            "test_goods_received_line_translation",
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

        for record in test_data::test_pull_delete_records() {
            println!("test_pull_delete_records ran");
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();
            assert_eq!(translation_result, record.translated_record);
        }
    }
}
