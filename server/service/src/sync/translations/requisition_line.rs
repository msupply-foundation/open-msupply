use crate::sync::translations::{item::ItemTranslation, requisition::RequisitionTranslation};

use util::sync_serde::{empty_str_as_option, empty_str_as_option_string, object_fields_as_option};

use chrono::{NaiveDate, NaiveDateTime};
use repository::{
    ChangelogRow, ChangelogTableName, EqualFilter, ItemLinkRowRepository, RequisitionFilter,
    RequisitionLineRow, RequisitionLineRowDelete, RequisitionLineRowRepository,
    RequisitionRepository, RnRFormLineFilter, RnRFormLineRepository, StorageConnection,
    SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::constants::APPROX_NUMBER_OF_DAYS_IN_A_MONTH_IS_30;

use super::{PullTranslateResult, PushTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize, PartialEq)]
pub struct RequisitionLineOmsFields {
    pub rnr_form_line_id: Option<String>, // Actually from rnr table and only included in sync push so that OG auth module can use
    pub expiry_date: Option<NaiveDate>, // Actually from rnr table and only included in sync push so that OG auth module can use
    pub price_per_unit: Option<f64>,
    pub available_volume: Option<f64>,
    pub location_type_id: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, PartialEq)]
pub struct LegacyRequisitionLineRow {
    pub ID: String,
    pub requisition_ID: String,
    pub item_ID: String,

    // requested_quantity
    pub Cust_stock_order: f64,
    pub suggested_quantity: f64,
    // supply_quantity
    pub actualQuan: f64,
    // available_stock_on_hand
    pub stock_on_hand: f64,
    // average_monthly_consumption: daily_usage * NUMBER_OF_DAYS_IN_A_MONTH
    pub daily_usage: f64,

    pub approved_quantity: f64,

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

    #[serde(rename = "Cust_prev_stock_balance")]
    pub initial_stock_on_hand_units: f64,

    #[serde(rename = "Cust_stock_received")]
    pub incoming_units: f64,

    #[serde(rename = "Cust_stock_issued")]
    pub outgoing_units: f64,

    #[serde(rename = "stockLosses")]
    pub loss_in_units: f64,

    #[serde(rename = "stockAdditions")]
    pub addition_in_units: f64,

    #[serde(rename = "stockExpiring")]
    pub expiring_units: f64,

    #[serde(rename = "days_out_or_new_demand")]
    pub days_out_of_stock: f64,

    #[serde(rename = "optionID")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub option_id: Option<String>,

    #[serde(rename = "Cust_loss_adjust")]
    pub stock_adjustment_in_units: f64,

    #[serde(default, deserialize_with = "object_fields_as_option")]
    pub oms_fields: Option<RequisitionLineOmsFields>,
}
// Needs to be added to all_translators()
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

        let (price_per_unit, available_volume, location_type_id) = match data.oms_fields {
            Some(fields) => (
                fields.price_per_unit,
                fields.available_volume,
                fields.location_type_id,
            ),
            None => (None, None, None),
        };

        let result = RequisitionLineRow {
            id: data.ID.to_string(),
            requisition_id: data.requisition_ID,
            item_link_id: data.item_ID,
            requested_quantity: data.Cust_stock_order,
            suggested_quantity: data.suggested_quantity,
            supply_quantity: data.actualQuan,
            available_stock_on_hand: data.stock_on_hand,
            average_monthly_consumption: (data.daily_usage
                * APPROX_NUMBER_OF_DAYS_IN_A_MONTH_IS_30)
                .ceil(),
            comment: data.comment,
            snapshot_datetime: data.snapshot_datetime,
            approved_quantity: data.approved_quantity,
            approval_comment: data.approval_comment,
            item_name: data.item_name,
            initial_stock_on_hand_units: data.initial_stock_on_hand_units,
            incoming_units: data.incoming_units,
            outgoing_units: data.outgoing_units,
            loss_in_units: data.loss_in_units,
            addition_in_units: data.addition_in_units,
            expiring_units: data.expiring_units,
            days_out_of_stock: data.days_out_of_stock,
            option_id: data.option_id,
            price_per_unit,
            available_volume,
            location_type_id,
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
            item_name,
            initial_stock_on_hand_units,
            incoming_units,
            outgoing_units,
            loss_in_units,
            addition_in_units,
            expiring_units,
            days_out_of_stock,
            option_id,
            price_per_unit,
            available_volume,
            location_type_id,
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

        let is_program_requisition = RequisitionRepository::new(connection)
            .query_by_filter(
                RequisitionFilter::new().id(EqualFilter::equal_to(requisition_id.to_string())),
            )?
            .pop()
            .map(|requisition| requisition.program.is_some())
            .unwrap_or(false);

        let prev_stock_balance = if is_program_requisition {
            initial_stock_on_hand_units
        } else {
            available_stock_on_hand
        };

        let rnr_form_line = RnRFormLineRepository::new(connection).query_one(
            RnRFormLineFilter::new().requisition_line_id(EqualFilter::equal_to(id.to_string())),
        )?;

        let expiry_date = rnr_form_line
            .as_ref()
            .and_then(|line| line.rnr_form_line_row.expiry_date);
        let rnr_form_line_id = rnr_form_line
            .as_ref()
            .map(|line| line.rnr_form_line_row.id.clone());

        let oms_fields = Some(RequisitionLineOmsFields {
            rnr_form_line_id,
            expiry_date,
            price_per_unit,
            available_volume,
            location_type_id,
        });

        let legacy_row = LegacyRequisitionLineRow {
            ID: id,
            requisition_ID: requisition_id,
            item_ID: item_id,
            Cust_stock_order: requested_quantity,
            suggested_quantity,
            actualQuan: supply_quantity,
            stock_on_hand: available_stock_on_hand,
            daily_usage: average_monthly_consumption / APPROX_NUMBER_OF_DAYS_IN_A_MONTH_IS_30,
            comment,
            snapshot_datetime,
            approved_quantity,
            approval_comment,
            item_name,
            initial_stock_on_hand_units: prev_stock_balance,
            incoming_units,
            outgoing_units,
            loss_in_units,
            addition_in_units,
            expiring_units,
            days_out_of_stock,
            option_id,
            stock_adjustment_in_units: addition_in_units - loss_in_units,
            oms_fields,
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
