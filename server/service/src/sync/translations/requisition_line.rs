use crate::sync::{
    sync_serde::{empty_str_as_option, empty_str_as_option_string},
    translations::{item::ItemTranslation, requisition::RequisitionTranslation},
};
use chrono::NaiveDateTime;
use repository::{
    ChangelogRow, ChangelogTableName, ItemLinkRowRepository, ItemRowRepository, RequisitionLineRow,
    RequisitionLineRowDelete, RequisitionLineRowRepository, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::constants::NUMBER_OF_DAYS_IN_A_MONTH;

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

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
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(RequisitionLineTranslation)
}

pub(super) struct RequisitionLineTranslation;
impl SyncTranslation for RequisitionLineTranslation {
    fn table_name(&self) -> &str {
        "requisition_line"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            RequisitionTranslation.table_name(),
            ItemTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::RequisitionLine)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let data = serde_json::from_str::<LegacyRequisitionLineRow>(&sync_record.data)?;

        let result = RequisitionLineRow {
            id: data.ID.to_string(),
            requisition_id: data.requisition_ID,
            item_link_id: data.item_ID,
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
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // TODO, check site ? (should never get delete records for this site, only transfer other half)
        Ok(PullTranslateResult::delete(RequisitionLineRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let RequisitionLineRow {
            id,
            requisition_id,
            item_link_id,
            requested_quantity,
            suggested_quantity,
            supply_quantity,
            available_stock_on_hand,
            average_monthly_consumption,
            comment,
            snapshot_datetime,
            approved_quantity,
            approval_comment,
        } = RequisitionLineRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or(anyhow::Error::msg(format!(
                "Requisition line row not found: {}",
                changelog.record_id
            )))?;

        // The item_id from RequisitionLineRow is actually for an item_link_id, so we get the true item_id here
        let item_id = ItemLinkRowRepository::new(connection)
            .find_one_by_id(&item_link_id)?
            .ok_or(anyhow::anyhow!(
                "Item link ({item_link_id}) not found in requisition line ({id})"
            ))?
            .item_id;

        // Required for backward compatibility (authorisation web app uses this to display item name)
        let item_name = ItemRowRepository::new(connection)
            .find_active_by_id(&item_id)?
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

        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy_row)?,
        ))
    }

    fn try_translate_to_delete_sync_record(
        &self,
        _: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        Ok(PushTranslateResult::delete(changelog, self.table_name()))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::{
        test::merge_helpers::merge_all_item_links, translations::ToSyncRecordTranslationType,
    };

    use super::*;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ChangelogFilter, ChangelogRepository,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_requisition_line_translation() {
        use crate::sync::test::test_data::requisition_line as test_data;
        let translator = RequisitionLineTranslation {};

        let (_, connection, _, _) =
            setup_all("test_requisition_line_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    #[actix_rt::test]
    async fn test_requisition_line_push_merged() {
        // The item_links_merged function will merge ALL items into item_a, so all stock_lines should have an item_id of "item_a" regardless of their original item_id.
        let (mock_data, connection, _, _) = setup_all(
            "test_requisition_line_push_item_link_merged",
            MockDataInserts::all(),
        )
        .await;

        merge_all_item_links(&connection, &mock_data).unwrap();

        let repo = ChangelogRepository::new(&connection);
        let changelogs = repo
            .changelogs(
                0,
                1_000_000,
                Some(
                    ChangelogFilter::new()
                        .table_name(ChangelogTableName::RequisitionLine.equal_to()),
                ),
            )
            .unwrap();

        let translator = RequisitionLineTranslation;
        for changelog in changelogs {
            assert!(translator.should_translate_to_sync_record(
                &changelog,
                &ToSyncRecordTranslationType::PushToLegacyCentral
            ));
            let translated = translator
                .try_translate_to_upsert_sync_record(&connection, &changelog)
                .unwrap();

            assert!(matches!(translated, PushTranslateResult::PushRecord(_)));

            let PushTranslateResult::PushRecord(translated) = translated else {
                panic!("Test fail, should translate")
            };

            assert_eq!(translated[0].record.record_data["item_ID"], json!("item_a"));
        }
    }
}
