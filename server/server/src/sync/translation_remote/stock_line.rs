use chrono::NaiveDate;
use repository::schema::{RemoteSyncBufferRow, StockLineRow};

use serde::{Deserialize, Deserializer};

use crate::sync::translation_central::SyncTranslationError;

use super::TRANSLATION_RECORD_ITEM_LINE;

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
pub struct LegacyStockLineRow {
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

impl LegacyStockLineRow {
    pub fn try_translate_pull(
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<StockLineRow>, SyncTranslationError> {
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

        Ok(Some(StockLineRow {
            id: data.ID.clone(),
            store_id: data.store_ID.clone(),
            item_id: data.item_ID.clone(),
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
        }))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::translation_remote::{
        stock_line::LegacyStockLineRow,
        test_data::{stock_line::get_test_stock_line_records, TestSyncDataRecord},
    };

    #[test]
    fn test_stock_line_translation() {
        for record in get_test_stock_line_records() {
            match record.translated_record {
                TestSyncDataRecord::StockLine(translated_record) => {
                    assert_eq!(
                        LegacyStockLineRow::try_translate_pull(&record.remote_sync_buffer_row)
                            .unwrap(),
                        translated_record,
                        "{}",
                        record.identifier
                    )
                }
                _ => panic!("Testing wrong record type {:#?}", record.translated_record),
            }
        }
    }
}
