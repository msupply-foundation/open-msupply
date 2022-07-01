use crate::sync::sync_serde::{
    date_from_date_time, date_option_to_isostring, date_to_isostring, empty_date_time_as_option,
    empty_str_as_option, naive_time, zero_date_as_option,
};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use repository::{
    ChangelogRow, ChangelogTableName, StocktakeRow, StocktakeRowRepository, StocktakeStatus,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{
    IntegrationRecords, LegacyTableName, PullUpsertRecord, PushUpsertRecord, SyncTranslation,
};

#[derive(Debug, Deserialize, Serialize)]
pub enum LegacyStocktakeStatus {
    /// From the 4d code this is used for new
    #[serde(rename = "sg")]
    Sg,
    /// finalised
    #[serde(rename = "fn")]
    Fn,
    /// Bucket to catch all other variants
    #[serde(other)]
    Others,
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
    /// Its actually the stock_take_created_time:
    #[serde(deserialize_with = "naive_time")]
    pub stock_take_time: NaiveTime,

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

pub(crate) struct StocktakeTranslation {}
impl SyncTranslation for StocktakeTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        let table_name = LegacyTableName::STOCKTAKE;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyStocktakeRow>(&sync_record.data)?;
        let (created_datetime, finalised_datetime) = match data.created_datetime {
            Some(created_datetime) => {
                // use new om_* fields
                (created_datetime, data.finalised_datetime)
            }
            None => (
                data.stock_take_created_date.and_time(data.stock_take_time),
                None,
            ),
        };

        let result = StocktakeRow {
            id: data.ID,
            user_id: data.user_id,
            store_id: data.store_ID,
            stocktake_number: data.serial_number,
            comment: data.comment,
            description: data.Description,
            status: stocktake_status(&data.status).ok_or(anyhow::Error::msg(format!(
                "Unexpected stocktake status: {:?}",
                data.status
            )))?,
            created_datetime,
            finalised_datetime,
            inventory_adjustment_id: data.invad_additions_ID,
            stocktake_date: data.stocktake_date,
            is_locked: data.is_locked,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Stocktake(result),
        )))
    }

    fn try_translate_push(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, anyhow::Error> {
        if changelog.table_name != ChangelogTableName::Stocktake {
            return Ok(None);
        }
        let table_name = LegacyTableName::STOCKTAKE;

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
            .find_one_by_id(&changelog.row_id)?
            .ok_or(anyhow::Error::msg("Stocktake row not found"))?;

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
            stock_take_time: created_datetime.time(),
            created_datetime: Some(created_datetime),
            finalised_datetime,
        };

        Ok(Some(vec![PushUpsertRecord {
            sync_id: changelog.id,
            store_id: Some(store_id),
            table_name,
            record_id: id,
            data: serde_json::to_value(&legacy_row)?,
        }]))
    }
}

fn stocktake_status(status: &LegacyStocktakeStatus) -> Option<StocktakeStatus> {
    let status = match status {
        LegacyStocktakeStatus::Sg => StocktakeStatus::New,
        LegacyStocktakeStatus::Fn => StocktakeStatus::Finalised,
        _ => return None,
    };
    Some(status)
}

fn legacy_stocktake_status(status: &StocktakeStatus) -> LegacyStocktakeStatus {
    match status {
        StocktakeStatus::New => LegacyStocktakeStatus::Sg,
        StocktakeStatus::Finalised => LegacyStocktakeStatus::Fn,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_stocktake_translation() {
        use crate::sync::test::test_data::stocktake as test_data;
        let translator = StocktakeTranslation {};

        let (_, connection, _, _) =
            setup_all("test_stocktake_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_records() {
            let translation_result = translator
                .try_translate_pull(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
