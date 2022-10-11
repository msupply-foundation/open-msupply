use crate::sync::sync_serde::{date_option_to_isostring, empty_str_as_option, zero_date_as_option};
use chrono::NaiveDate;
use repository::{
    ChangelogRow, ChangelogTableName, StockLineRow, StockLineRowRepository, StorageConnection,
    SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{
    IntegrationRecords, LegacyTableName, PullUpsertRecord, PushUpsertRecord, SyncTranslation,
};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyStockLineRow {
    pub ID: String,
    pub store_ID: String,
    pub item_ID: String,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub batch: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub expiry_date: Option<NaiveDate>,
    pub hold: bool,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub location_ID: Option<String>,
    pub pack_size: i32,
    pub available: f64,
    pub quantity: f64,
    pub cost_price: f64,
    pub sell_price: f64,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub note: Option<String>,
}

pub(crate) struct StockLineTranslation {}
impl SyncTranslation for StockLineTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let table_name = LegacyTableName::ITEM_LINE;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyStockLineRow>(&sync_record.data)?;

        let result = StockLineRow {
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
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::StockLine(result),
        )))
    }

    fn try_translate_push(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, anyhow::Error> {
        if changelog.table_name != ChangelogTableName::StockLine {
            return Ok(None);
        }
        let table_name = LegacyTableName::ITEM_LINE;

        let StockLineRow {
            id,
            item_id,
            store_id,
            location_id,
            batch,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            available_number_of_packs,
            total_number_of_packs,
            expiry_date,
            on_hold,
            note,
        } = StockLineRowRepository::new(connection).find_one_by_id(&changelog.record_id)?;

        let legacy_row = LegacyStockLineRow {
            ID: id.clone(),
            store_ID: store_id,
            item_ID: item_id,
            batch,
            expiry_date,
            hold: on_hold,
            location_ID: location_id,
            pack_size,
            available: available_number_of_packs,
            quantity: total_number_of_packs,
            cost_price: cost_price_per_pack,
            sell_price: sell_price_per_pack,
            note,
        };

        Ok(Some(vec![PushUpsertRecord {
            sync_id: changelog.cursor,
            table_name,
            record_id: id,
            data: serde_json::to_value(&legacy_row)?,
        }]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_stock_line_translation() {
        use crate::sync::test::test_data::stock_line as test_data;
        let translator = StockLineTranslation {};

        let (_, connection, _, _) =
            setup_all("test_stock_line_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
