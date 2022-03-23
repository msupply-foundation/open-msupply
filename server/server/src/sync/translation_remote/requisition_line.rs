use chrono::NaiveDateTime;
use repository::{
    schema::{ChangelogRow, ChangelogTableName, RemoteSyncBufferRow, RequisitionLineRow},
    RequisitionLineRowRepository, StorageConnection,
};

use serde::{Deserialize, Serialize};
use util::constants::NUMBER_OF_DAYS_IN_A_MONTH;

use crate::sync::SyncTranslationError;

use super::{
    empty_date_time_as_option, empty_str_as_option,
    pull::{IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation},
    push::{to_push_translation_error, PushUpsertRecord, RemotePushUpsertTranslation},
    TRANSLATION_RECORD_REQUISITION_LINE,
};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, PartialEq)]
pub struct LegacyRequisitionLineRow {
    pub ID: String,
    pub requisition_ID: String,
    pub item_ID: String,

    // requested_quantity
    pub Cust_stock_order: i32,
    pub suggested_quantity: i32,
    // supply_quantity
    pub actualQuan: i32,
    // available_stock_on_hand
    pub stock_on_hand: i32,
    // average_monthly_consumption: daily_usage * NUMBER_OF_DAYS_IN_A_MONTH
    pub daily_usage: f64,

    #[serde(deserialize_with = "empty_str_as_option")]
    pub comment: Option<String>,

    #[serde(rename = "om_calculation_datetime")]
    #[serde(default)]
    #[serde(deserialize_with = "empty_date_time_as_option")]
    pub calculation_datetime: Option<NaiveDateTime>,
}

pub struct RequisitionLineTranslation {}
impl RemotePullTranslation for RequisitionLineTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<IntegrationRecord>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_REQUISITION_LINE;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyRequisitionLineRow>(&sync_record.data).map_err(
            |source| SyncTranslationError {
                table_name,
                source: source.into(),
                record: sync_record.data.clone(),
            },
        )?;

        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::RequisitionLine(RequisitionLineRow {
                id: data.ID.to_string(),
                requisition_id: data.requisition_ID,
                item_id: data.item_ID,
                requested_quantity: data.Cust_stock_order,
                suggested_quantity: data.suggested_quantity,
                supply_quantity: data.actualQuan,
                available_stock_on_hand: data.stock_on_hand,
                average_monthly_consumption: (data.daily_usage * NUMBER_OF_DAYS_IN_A_MONTH) as i32,
                comment: data.comment,
            }),
        )))
    }
}

impl RemotePushUpsertTranslation for RequisitionLineTranslation {
    fn try_translate_push(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, SyncTranslationError> {
        if changelog.table_name != ChangelogTableName::RequisitionLine {
            return Ok(None);
        }
        let table_name = TRANSLATION_RECORD_REQUISITION_LINE;

        let RequisitionLineRow {
            id,
            requisition_id,
            item_id,
            requested_quantity,
            suggested_quantity,
            supply_quantity,
            available_stock_on_hand,
            average_monthly_consumption,
            comment,
        } = RequisitionLineRowRepository::new(connection)
            .find_one_by_id(&changelog.row_id)
            .map_err(|err| to_push_translation_error(table_name, err.into(), changelog))?
            .ok_or(to_push_translation_error(
                table_name,
                anyhow::Error::msg(format!(
                    "Requisition line row not found: {}",
                    changelog.row_id
                )),
                changelog,
            ))?;

        let legacy_row = LegacyRequisitionLineRow {
            ID: id.clone(),
            requisition_ID: requisition_id,
            item_ID: item_id,
            Cust_stock_order: requested_quantity,
            suggested_quantity,
            actualQuan: supply_quantity,
            stock_on_hand: available_stock_on_hand,
            daily_usage: average_monthly_consumption as f64 / NUMBER_OF_DAYS_IN_A_MONTH,
            comment,
            calculation_datetime: None,
        };

        Ok(Some(vec![PushUpsertRecord {
            sync_id: changelog.id,
            // TODO:
            store_id: None,
            table_name,
            record_id: id,
            data: serde_json::to_value(&legacy_row)
                .map_err(|err| to_push_translation_error(table_name, err.into(), changelog))?,
        }]))
    }
}
