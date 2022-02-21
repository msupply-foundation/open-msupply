use chrono::NaiveDate;
use repository::{
    schema::{RemoteSyncBufferRow, StockLineRow},
    StorageConnection,
};

use serde::Deserialize;

use crate::sync::SyncTranslationError;

use super::{
    empty_str_as_option, zero_date_as_option, IntegrationRecord, IntegrationUpsertRecord,
    RemotePullTranslation, TRANSLATION_RECORD_ITEM_LINE,
};

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyStockLineRow {
    ID: String,
    store_ID: String,
    item_ID: String,
    #[serde(deserialize_with = "empty_str_as_option")]
    batch: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    expiry_date: Option<NaiveDate>,
    hold: bool,
    #[serde(deserialize_with = "empty_str_as_option")]
    location_ID: Option<String>,
    pack_size: i32,
    available: i32,
    quantity: i32,
    cost_price: f64,
    sell_price: f64,
    note: Option<String>,
}

pub struct StockLineTranslation {}
impl RemotePullTranslation for StockLineTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<super::IntegrationRecord>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_ITEM_LINE;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data =
            serde_json::from_str::<LegacyStockLineRow>(&sync_record.data).map_err(|source| {
                SyncTranslationError {
                    table_name,
                    source: source.into(),
                    record: sync_record.data.clone(),
                }
            })?;

        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::StockLine(StockLineRow {
                id: data.ID,
                store_id: data.store_ID,
                item_id: data.item_ID,
                location_id: data.location_ID,
                batch: data.batch,
                pack_size: data.pack_size,
                cost_price_per_pack: data.cost_price,
                sell_price_per_pack: data.sell_price,
                available_number_of_packs: data.available,
                total_number_of_packs: data.quantity,
                expiry_date: data.expiry_date,
                on_hold: data.hold,
                note: data.note,
            }),
        )))
    }
}
