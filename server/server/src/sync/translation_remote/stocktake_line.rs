use chrono::NaiveDate;
use repository::{
    schema::{ChangelogRow, ChangelogTableName, RemoteSyncBufferRow, StocktakeLineRow},
    StockLineRowRepository, StocktakeLineRowRepository, StorageConnection,
};
use serde::{Deserialize, Serialize};

use super::{
    date_option_to_isostring, empty_str_as_option,
    pull::{IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation},
    push::{PushUpsertRecord, RemotePushUpsertTranslation},
    zero_date_as_option, TRANSLATION_RECORD_STOCKTAKE_LINE,
};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyStocktakeLineRow {
    pub ID: String,
    pub stock_take_ID: String,

    #[serde(deserialize_with = "empty_str_as_option")]
    pub location_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub comment: Option<String>,
    pub snapshot_qty: i32,
    pub snapshot_packsize: i32,
    pub stock_take_qty: i32,
    pub is_edited: bool,
    // TODO is this optional?
    #[serde(deserialize_with = "empty_str_as_option")]
    pub item_line_ID: Option<String>,
    pub item_ID: String,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub Batch: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub expiry: Option<NaiveDate>,
    pub cost_price: f64,
    pub sell_price: f64,

    #[serde(rename = "om_note")]
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(default)]
    pub note: Option<String>,
}

pub struct StocktakeLineTranslation {}
impl RemotePullTranslation for StocktakeLineTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<IntegrationRecord>, anyhow::Error> {
        let table_name = TRANSLATION_RECORD_STOCKTAKE_LINE;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyStocktakeLineRow>(&sync_record.data)?;

        // TODO is this correct?
        let counted_number_of_packs = if data.is_edited {
            Some(data.stock_take_qty)
        } else {
            None
        };
        let mut row = StocktakeLineRow {
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
        };
        // the following lines are from stock_line, manually unset when stock_line is None
        // (because they are otherwise set to Some(0.0)
        if row.stock_line_id.is_none() {
            row.batch = None;
            row.expiry_date = None;
            row.pack_size = None;
            row.cost_price_per_pack = None;
            row.sell_price_per_pack = None;
            row.note = None;
        }
        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::StocktakeLine(row),
        )))
    }
}

impl RemotePushUpsertTranslation for StocktakeLineTranslation {
    fn try_translate_push(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, anyhow::Error> {
        if changelog.table_name != ChangelogTableName::StocktakeLine {
            return Ok(None);
        }
        let table_name = TRANSLATION_RECORD_STOCKTAKE_LINE;

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
        } = StocktakeLineRowRepository::new(connection)
            .find_one_by_id(&changelog.row_id)?
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
            stock_take_qty: counted_number_of_packs.unwrap_or(0),
            is_edited: counted_number_of_packs.is_some(),
            item_line_ID: stock_line_id,
            item_ID: item_id,
            snapshot_packsize: stock_line
                .as_ref()
                .map(|it| it.pack_size)
                .or(pack_size)
                .unwrap_or(0),
            Batch: stock_line
                .as_ref()
                .and_then(|it| it.batch.clone())
                .or(batch),
            expiry: stock_line
                .as_ref()
                .and_then(|it| it.expiry_date)
                .or(expiry_date),
            cost_price: stock_line
                .as_ref()
                .map(|it| it.cost_price_per_pack)
                .or(cost_price_per_pack)
                .unwrap_or(0.0),
            sell_price: stock_line
                .map(|it| it.sell_price_per_pack)
                .or(sell_price_per_pack)
                .unwrap_or(0.0),
            note,
        };

        Ok(Some(vec![PushUpsertRecord {
            sync_id: changelog.id,
            store_id: None,
            table_name,
            record_id: id,
            data: serde_json::to_value(&legacy_row)?,
        }]))
    }
}
