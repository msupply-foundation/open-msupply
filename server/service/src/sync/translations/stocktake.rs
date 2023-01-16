use crate::sync::{
    api::RemoteSyncRecordV5,
    sync_serde::{
        date_from_date_time, date_option_to_isostring, date_to_isostring, empty_str_as_option,
        empty_str_as_option_string, naive_time, zero_date_as_option,
    },
};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use repository::{
    ChangelogRow, ChangelogTableName, StocktakeRow, StocktakeRowRepository, StocktakeStatus,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::STOCKTAKE;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::Stocktake
}

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
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub Description: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub comment: Option<String>,
    #[serde(rename = "Locked")]
    pub is_locked: bool,

    #[serde(rename = "invad_additions_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub inventory_addition_id: Option<String>,
    #[serde(rename = "invad_reductions_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub inventory_reduction_id: Option<String>,

    // Ignore invad_reductions_ID for V1
    // #[serde(deserialize_with = "empty_str_as_option_string")]
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
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(default)]
    pub created_datetime: Option<NaiveDateTime>,

    #[serde(rename = "om_finalised_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    #[serde(default)]
    pub finalised_datetime: Option<NaiveDateTime>,
}

pub(crate) struct StocktakeTranslation {}
impl SyncTranslation for StocktakeTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
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
            inventory_addition_id: data.inventory_addition_id,
            inventory_reduction_id: data.inventory_reduction_id,
            stocktake_date: data.stocktake_date,
            is_locked: data.is_locked,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Stocktake(result),
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
            is_locked,
            stocktake_date,
            inventory_addition_id,
            inventory_reduction_id,
        } = StocktakeRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
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
            inventory_addition_id,
            inventory_reduction_id,
            serial_number: stocktake_number,
            stock_take_created_date: date_from_date_time(&created_datetime),
            stock_take_time: created_datetime.time(),
            created_datetime: Some(created_datetime),
            finalised_datetime,
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

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
