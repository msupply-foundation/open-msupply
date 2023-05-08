use crate::sync::{
    api::RemoteSyncRecordV5,
    sync_serde::{empty_str_as_option, empty_str_as_option_string},
};
use chrono::NaiveDateTime;
use repository::{
    ChangelogRow, ChangelogTableName, ItemRowRepository, RequisitionLineRow,
    RequisitionLineRowRepository, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::constants::NUMBER_OF_DAYS_IN_A_MONTH;

use super::{
    IntegrationRecords, LegacyTableName, PullDeleteRecordTable, PullUpsertRecord, SyncTranslation,
};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::REQUISITION_LINE;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::RequisitionLine
}

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

    pub approved_quantity: i32,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "authoriser_comment")]
    pub approval_comment: Option<String>,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub comment: Option<String>,

    #[serde(rename = "om_snapshot_datetime")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub snapshot_datetime: Option<NaiveDateTime>,

    #[serde(rename = "itemName")]
    pub item_name: String,
}

pub(crate) struct RequisitionLineTranslation {}
impl SyncTranslation for RequisitionLineTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyRequisitionLineRow>(&sync_record.data)?;

        let result = RequisitionLineRow {
            id: data.ID.to_string(),
            requisition_id: data.requisition_ID,
            item_id: data.item_ID,
            requested_quantity: data.Cust_stock_order,
            suggested_quantity: data.suggested_quantity,
            supply_quantity: data.actualQuan,
            available_stock_on_hand: data.stock_on_hand,
            average_monthly_consumption: (data.daily_usage * NUMBER_OF_DAYS_IN_A_MONTH).ceil()
                as i32,
            comment: data.comment,
            snapshot_datetime: data.snapshot_datetime,
            approved_quantity: data.approved_quantity,
            approval_comment: data.approval_comment,
            is_sync_update: true,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::RequisitionLine(result),
        )))
    }

    fn try_translate_pull_delete(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        // TODO, check site ? (should never get delete records for this site, only transfer other half)
        let result = match_pull_table(sync_record).then(|| {
            IntegrationRecords::from_delete(
                &sync_record.record_id,
                PullDeleteRecordTable::RequisitionLine,
            )
        });

        Ok(result)
    }

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        if !match_push_table(changelog) {
            return Ok(None);
        }

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
            snapshot_datetime,
            approved_quantity,
            approval_comment,
            is_sync_update: _,
        } = RequisitionLineRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Requisition line row not found: {}",
                changelog.record_id
            )))?;

        // Required for backward compatibility (authorisation web app uses this to display item name)
        let item_name = ItemRowRepository::new(connection)
            .find_one_by_id(&item_id)?
            .ok_or(anyhow::anyhow!(
                "Item ({item_id}) not found in requisition line ({id})"
            ))?
            .name;

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
            snapshot_datetime,
            approved_quantity,
            approval_comment,
            item_name,
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
    async fn test_requisition_line_translation() {
        use crate::sync::test::test_data::requisition_line as test_data;
        let translator = RequisitionLineTranslation {};

        let (_, connection, _, _) =
            setup_all("test_requisition_line_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            let translation_result = translator
                .try_translate_pull_delete(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
