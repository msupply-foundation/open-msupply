use chrono::NaiveDate;
use repository::{
    schema::{RemoteSyncBufferRow, StocktakeLineRow},
    StorageConnection,
};
use serde::Deserialize;

use crate::sync::SyncTranslationError;

use super::{
    empty_str_as_option, zero_date_as_option, IntegrationRecord, IntegrationUpsertRecord,
    RemotePullTranslation, TRANSLATION_RECORD_STOCKTAKE_LINE,
};

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyStocktakeLineRow {
    ID: String,
    stock_take_ID: String,

    #[serde(deserialize_with = "empty_str_as_option")]
    location_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    comment: Option<String>,
    snapshot_qty: i32,
    snapshot_packsize: i32,
    stock_take_qty: i32,
    is_edited: bool,
    // TODO is this optional?
    #[serde(deserialize_with = "empty_str_as_option")]
    item_line_ID: Option<String>,
    item_ID: String,
    #[serde(deserialize_with = "empty_str_as_option")]
    Batch: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    expiry: Option<NaiveDate>,
    cost_price: f64,
    sell_price: f64,
}

pub struct StocktakeLineTranslation {}
impl RemotePullTranslation for StocktakeLineTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<super::IntegrationRecord>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_STOCKTAKE_LINE;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyStocktakeLineRow>(&sync_record.data).map_err(
            |source| SyncTranslationError {
                table_name,
                source: source.into(),
                record: sync_record.data.clone(),
            },
        )?;

        // TODO is this correct?
        let counted_number_of_packs = if data.is_edited {
            Some(data.stock_take_qty)
        } else {
            None
        };
        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::StocktakeLine(StocktakeLineRow {
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
                // TODO: correct?
                pack_size: Some(data.snapshot_packsize),
                cost_price_per_pack: Some(data.cost_price),
                sell_price_per_pack: Some(data.sell_price),
                note: None,
            }),
        )))
    }
}
