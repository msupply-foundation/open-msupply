use chrono::NaiveDate;
use repository::{
    schema::{RemoteSyncBufferRow, StocktakeRow, StocktakeStatus},
    StorageConnection,
};
use serde::Deserialize;

use crate::sync::SyncTranslationError;

use super::{
    date_and_time_to_datatime, empty_str_as_option, IntegrationRecord, IntegrationUpsertRecord,
    RemotePullTranslation, TRANSLATION_RECORD_STOCKTAKE,
};

#[derive(Deserialize)]
enum LegacyStocktakeStatus {
    /// From the 4d code this is used for new
    #[serde(rename = "sg")]
    Sg,
    /// finalised
    #[serde(rename = "fn")]
    Fn,
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyStocktakeRow {
    ID: String,
    #[serde(rename = "type")]
    #[serde(deserialize_with = "empty_str_as_option")]
    _type: Option<String>,
    status: LegacyStocktakeStatus,
    #[serde(deserialize_with = "empty_str_as_option")]
    Description: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    comment: Option<String>,
    Locked: bool,

    #[serde(deserialize_with = "empty_str_as_option")]
    invad_additions_ID: Option<String>,

    // Ignore invad_reductions_ID for V1
    // #[serde(deserialize_with = "empty_str_as_option")]
    // invad_reductions_ID: Option<String>,
    serial_number: i64,
    stock_take_created_date: NaiveDate,
    store_ID: String,
}

pub struct StocktakeTranslation {}
impl RemotePullTranslation for StocktakeTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<super::IntegrationRecord>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_STOCKTAKE;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data =
            serde_json::from_str::<LegacyStocktakeRow>(&sync_record.data).map_err(|source| {
                SyncTranslationError {
                    table_name,
                    source: source.into(),
                    record: sync_record.data.clone(),
                }
            })?;

        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Stocktake(StocktakeRow {
                id: data.ID,
                store_id: data.store_ID,
                stocktake_number: data.serial_number,
                comment: data.comment,
                description: data.Description,
                status: stocktake_status(&data.status),
                created_datetime: date_and_time_to_datatime(data.stock_take_created_date, 0),
                // TODO finalise doesn't exist in mSupply?
                finalised_datetime: None,
                // TODO what is the correct mapping:
                inventory_adjustment_id: data.invad_additions_ID,
                is_locked: data.Locked,
            }),
        )))
    }
}

fn stocktake_status(status: &LegacyStocktakeStatus) -> StocktakeStatus {
    match status {
        LegacyStocktakeStatus::Sg => StocktakeStatus::New,
        LegacyStocktakeStatus::Fn => StocktakeStatus::Finalised,
    }
}
