use chrono::NaiveDate;
use repository::schema::{RemoteSyncBufferRow, StockLineRow};

use serde::{Deserialize, Deserializer};

use crate::sync::translation_central::SyncTranslationError;

use super::{
    IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation, TRANSLATION_RECORD_ITEM_LINE,
};

fn empty_str_as_option<'de, D: Deserializer<'de>>(d: D) -> Result<Option<String>, D::Error> {
    let s: Option<String> = Option::deserialize(d)?;
    Ok(s.filter(|s| !s.is_empty()))
}

fn zero_date_as_option<'de, D: Deserializer<'de>>(d: D) -> Result<Option<NaiveDate>, D::Error> {
    let s: Option<String> = Option::deserialize(d)?;
    Ok(s.filter(|s| s != "0000-00-00")
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok()))
}

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
                    source,
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

#[cfg(test)]
mod tests {
    use crate::sync::translation_remote::{
        stock_line::StockLineTranslation, test_data::stock_line::get_test_stock_line_records,
        RemotePullTranslation,
    };

    #[test]
    fn test_stock_line_translation() {
        for record in get_test_stock_line_records() {
            assert_eq!(
                StockLineTranslation {}
                    .try_translate_pull(&record.remote_sync_buffer_row)
                    .unwrap(),
                record.translated_record,
                "{}",
                record.identifier
            );
        }
    }
}
