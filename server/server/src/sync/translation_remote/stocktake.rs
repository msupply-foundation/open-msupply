use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    schema::{
        ChangelogRow, ChangelogTableName, RemoteSyncBufferRow, StocktakeRow, StocktakeStatus,
    },
    StocktakeRowRepository, StorageConnection,
};
use serde::{Deserialize, Serialize};

use crate::sync::SyncTranslationError;

use super::{
    date_and_time_to_datatime, date_from_date_time, date_option_to_isostring, date_to_isostring,
    empty_date_time_as_option, empty_str_as_option,
    pull::{IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation},
    push::{to_push_translation_error, PushUpsertRecord, RemotePushUpsertTranslation},
    zero_date_as_option, TRANSLATION_RECORD_STOCKTAKE,
};

#[derive(Deserialize, Serialize)]
pub enum LegacyStocktakeStatus {
    /// From the 4d code this is used for new
    #[serde(rename = "sg")]
    Sg,
    /// finalised
    #[serde(rename = "fn")]
    Fn,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyStocktakeRow {
    pub ID: String,
    #[serde(rename = "created_by_ID")]
    pub user_id: String,
    pub status: LegacyStocktakeStatus,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub Description: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub comment: Option<String>,
    #[serde(rename = "Locked")]
    pub is_locked: bool,

    #[serde(deserialize_with = "empty_str_as_option")]
    pub invad_additions_ID: Option<String>,

    // Ignore invad_reductions_ID for V1
    // #[serde(deserialize_with = "empty_str_as_option")]
    // invad_reductions_ID: Option<String>,
    pub serial_number: i64,
    #[serde(serialize_with = "date_to_isostring")]
    pub stock_take_created_date: NaiveDate,
    #[serde(rename = "stock_take_date")]
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub stocktake_date: Option<NaiveDate>,
    pub store_ID: String,

    #[serde(rename = "om_created_datetime")]
    pub created_datetime: Option<NaiveDateTime>,

    #[serde(rename = "om_finalised_datetime")]
    #[serde(default)]
    #[serde(deserialize_with = "empty_date_time_as_option")]
    pub finalised_datetime: Option<NaiveDateTime>,
}

pub struct StocktakeTranslation {}
impl RemotePullTranslation for StocktakeTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<IntegrationRecord>, SyncTranslationError> {
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
        let (created_datetime, finalised_datetime) = match data.created_datetime {
            Some(created_datetime) => {
                // use new om_* fields
                (created_datetime, data.finalised_datetime)
            }
            None => (
                date_and_time_to_datatime(data.stock_take_created_date, 0),
                None,
            ),
        };

        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Stocktake(StocktakeRow {
                id: data.ID,
                user_id: data.user_id,
                store_id: data.store_ID,
                stocktake_number: data.serial_number,
                comment: data.comment,
                description: data.Description,
                status: stocktake_status(&data.status),
                created_datetime,
                finalised_datetime,
                inventory_adjustment_id: data.invad_additions_ID,
                stocktake_date: data.stocktake_date,
                is_locked: data.is_locked,
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

impl RemotePushUpsertTranslation for StocktakeTranslation {
    fn try_translate_push(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, SyncTranslationError> {
        if changelog.table_name != ChangelogTableName::Stocktake {
            return Ok(None);
        }
        let table_name = TRANSLATION_RECORD_STOCKTAKE;

        let StocktakeRow {
            id,
            user_id,
            store_id,
            stocktake_number,
            comment,
            description,
            status,
            created_datetime,
            finalised_datetime,
            inventory_adjustment_id,
            is_locked,
            stocktake_date,
        } = StocktakeRowRepository::new(connection)
            .find_one_by_id(&changelog.row_id)
            .map_err(|err| to_push_translation_error(table_name, err.into(), changelog))?
            .ok_or(to_push_translation_error(
                table_name,
                anyhow::Error::msg("Stocktake row not found"),
                changelog,
            ))?;

        let legacy_row = LegacyStocktakeRow {
            ID: id.clone(),
            user_id,
            store_ID: store_id.clone(),
            status: legacy_stocktake_status(&status),
            Description: description,
            comment,
            is_locked,
            stocktake_date,
            invad_additions_ID: inventory_adjustment_id,
            serial_number: stocktake_number,
            stock_take_created_date: date_from_date_time(&created_datetime),
            created_datetime: Some(created_datetime),
            finalised_datetime,
        };

        Ok(Some(vec![PushUpsertRecord {
            sync_id: changelog.id,
            store_id: Some(store_id),
            table_name,
            record_id: id,
            data: serde_json::to_value(&legacy_row)
                .map_err(|err| to_push_translation_error(table_name, err.into(), changelog))?,
        }]))
    }
}

fn legacy_stocktake_status(status: &StocktakeStatus) -> LegacyStocktakeStatus {
    match status {
        StocktakeStatus::New => LegacyStocktakeStatus::Sg,
        StocktakeStatus::Finalised => LegacyStocktakeStatus::Fn,
    }
}
