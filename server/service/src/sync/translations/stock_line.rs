use crate::sync::{
    api::RemoteSyncRecordV5,
    sync_serde::{date_option_to_isostring, empty_str_as_option_string, zero_date_as_option},
};
use chrono::NaiveDate;
use repository::{
    ChangelogRow, ChangelogTableName, StockLineRow, StockLineRowRepository, StorageConnection,
    SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::ITEM_LINE;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::StockLine
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyStockLineRow {
    pub ID: String,
    pub store_ID: String,
    pub item_ID: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub batch: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub expiry_date: Option<NaiveDate>,
    pub hold: bool,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub location_ID: Option<String>,
    pub pack_size: i32,
    pub available: f64,
    pub quantity: f64,
    pub cost_price: f64,
    pub sell_price: f64,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub note: Option<String>,
}

pub(crate) struct StockLineTranslation {}
impl SyncTranslation for StockLineTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
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

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        if !match_push_table(changelog) {
            return Ok(None);
        }

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

        Ok(Some(vec![RemoteSyncRecordV5::new_upsert(
            changelog,
            LEGACY_TABLE_NAME,
            serde_json::to_value(&legacy_row)?,
        )]))
    }

    fn try_translate_push_delete(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        let result = match_push_table(changelog)
            .then(|| vec![RemoteSyncRecordV5::new_delete(changelog, LEGACY_TABLE_NAME)]);

        Ok(result)
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
