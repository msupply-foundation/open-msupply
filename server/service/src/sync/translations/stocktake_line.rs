use crate::sync::{
    sync_serde::{date_option_to_isostring, empty_str_as_option_string, zero_date_as_option},
    translations::{
        inventory_adjustment_reason::InventoryAdjustmentReasonTranslation, item::ItemTranslation,
        location::LocationTranslation, stock_line::StockLineTranslation,
        stocktake::StocktakeTranslation,
    },
};
use chrono::NaiveDate;
use repository::{
    ChangelogRow, ChangelogTableName, StockLineRowRepository, StocktakeLineRow,
    StocktakeLineRowRepository, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyStocktakeLineRow {
    pub ID: String,
    pub stock_take_ID: String,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub location_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub comment: Option<String>,
    pub snapshot_qty: f64,
    pub snapshot_packsize: i32,
    pub stock_take_qty: f64,
    pub is_edited: bool,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub item_line_ID: Option<String>,
    pub item_ID: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub Batch: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub expiry: Option<NaiveDate>,
    pub cost_price: f64,
    pub sell_price: f64,

    #[serde(rename = "om_note")]
    pub note: Option<String>,
    #[serde(rename = "optionID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub inventory_adjustment_reason_id: Option<String>,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(StocktakeLineTranslation)
}

pub(super) struct StocktakeLineTranslation;
impl SyncTranslation for StocktakeLineTranslation {
    fn table_name(&self) -> &'static str {
        "Stock_take_lines"
    }

    fn pull_dependencies(&self) -> Vec<&'static str> {
        vec![
            StocktakeTranslation.table_name(),
            StockLineTranslation.table_name(),
            ItemTranslation.table_name(),
            LocationTranslation.table_name(),
            InventoryAdjustmentReasonTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::StocktakeLine)
    }

    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyStocktakeLineRow>(&sync_record.data)?;

        // TODO is this correct?
        let counted_number_of_packs = if data.is_edited {
            Some(data.stock_take_qty)
        } else {
            None
        };
        let result = StocktakeLineRow {
            id: data.ID,
            stocktake_id: data.stock_take_ID,
            stock_line_id: data.item_line_ID,
            location_id: data.location_id,
            comment: data.comment,
            snapshot_number_of_packs: data.snapshot_qty,
            counted_number_of_packs,
            item_id: data.item_ID,
            batch: data.Batch,
            expiry_date: data.expiry,
            pack_size: Some(data.snapshot_packsize),
            cost_price_per_pack: Some(data.cost_price),
            sell_price_per_pack: Some(data.sell_price),
            note: data.note,
            inventory_adjustment_reason_id: data.inventory_adjustment_reason_id,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let StocktakeLineRow {
            id,
            stocktake_id,
            stock_line_id,
            location_id,
            comment,
            snapshot_number_of_packs,
            counted_number_of_packs,
            item_id,
            batch,
            expiry_date,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            note,
            inventory_adjustment_reason_id,
        } = StocktakeLineRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg("Stocktake row not found"))?;

        let stock_line = match &stock_line_id {
            Some(stock_line_id) => {
                Some(StockLineRowRepository::new(connection).find_one_by_id(&stock_line_id)?)
            }
            None => None,
        };
        let legacy_row = LegacyStocktakeLineRow {
            ID: id.clone(),
            stock_take_ID: stocktake_id,
            location_id,
            comment,
            snapshot_qty: snapshot_number_of_packs,
            stock_take_qty: counted_number_of_packs.unwrap_or(0.0),
            is_edited: counted_number_of_packs.is_some(),
            item_line_ID: stock_line_id,
            item_ID: item_id,
            snapshot_packsize: pack_size
                .unwrap_or(stock_line.as_ref().map(|it| it.pack_size).unwrap_or(0)),
            Batch: batch,
            expiry: expiry_date,
            cost_price: cost_price_per_pack.unwrap_or(0.0),
            sell_price: sell_price_per_pack.unwrap_or(0.0),
            note,
            inventory_adjustment_reason_id,
        };

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(&legacy_row)?,
        ))
    }

    fn try_translate_push_delete(
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
    async fn test_stock_take_line_translation() {
        use crate::sync::test::test_data::stocktake_line as test_data;
        let translator = StocktakeLineTranslation {};

        let (_, connection, _, _) =
            setup_all("test_stock_take_line_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.match_pull(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
