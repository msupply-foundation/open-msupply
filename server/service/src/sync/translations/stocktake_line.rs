use crate::sync::translations::{
    campaign::CampaignTranslation, item::ItemTranslation, location::LocationTranslation,
    master_list::MasterListTranslation, reason::ReasonTranslation,
    stock_line::StockLineTranslation, stocktake::StocktakeTranslation,
    vvm_status::VVMStatusTranslation,
};

use chrono::NaiveDate;
use repository::{
    campaign_row::CampaignRowRepository, item_variant::item_variant_row::ItemVariantRowRepository,
    ChangelogRow, ChangelogTableName,
    EqualFilter, LocationRowRepository, ProgramRowRepository, ReasonOptionRowRepository,
    StockLineRowRepository, StocktakeLine, StocktakeLineFilter, StocktakeLineRepository,
    StocktakeLineRow, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{
    date_option_to_isostring, empty_str_as_option_string, object_fields_as_option,
    zero_date_as_option,
};

use super::{utils::clear_invalid_fk, PullTranslateResult, PushTranslateResult, SyncTranslation};

const RECORD_TABLE: &str = "stocktake_line";

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyStocktakeLineRowOmsFields {
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub campaign_id: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub program_id: Option<String>,
    #[serde(default)]
    pub manufacture_date: Option<NaiveDate>,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyStocktakeLineRow {
    pub ID: String,
    pub stock_take_ID: String,

    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub location_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub comment: Option<String>,
    pub snapshot_qty: f64,
    pub snapshot_packsize: f64,
    pub stock_take_qty: f64,
    pub is_edited: bool,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub item_line_ID: Option<String>,
    pub item_ID: String,
    pub item_name: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub Batch: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub expiry: Option<NaiveDate>,
    pub cost_price: f64,
    pub sell_price: f64,

    #[serde(rename = "om_note")]
    pub note: Option<String>,
    #[serde(rename = "optionID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub reason_option_id: Option<String>,

    #[serde(rename = "om_item_variant_id")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(default)]
    pub item_variant_id: Option<String>,

    #[serde(rename = "donor_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(default)]
    pub donor_id: Option<String>,

    #[serde(rename = "vaccine_vial_monitor_status_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub vvm_status_id: Option<String>,
    pub volume_per_pack: f64,
    #[serde(rename = "manufacturer_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(default)]
    pub manufacturer_id: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "object_fields_as_option")]
    pub oms_fields: Option<LegacyStocktakeLineRowOmsFields>,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(StocktakeLineTranslation)
}

pub(super) struct StocktakeLineTranslation;
impl SyncTranslation for StocktakeLineTranslation {
    fn table_name(&self) -> &str {
        "Stock_take_lines"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            StocktakeTranslation.table_name(),
            StockLineTranslation.table_name(),
            ItemTranslation.table_name(),
            LocationTranslation.table_name(),
            ReasonTranslation.table_name(),
            VVMStatusTranslation.table_name(),
            CampaignTranslation.table_name(),
            MasterListTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::StocktakeLine)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyStocktakeLineRow {
            ID,
            stock_take_ID,
            location_id,
            comment,
            snapshot_qty,
            snapshot_packsize,
            stock_take_qty,
            is_edited,
            item_line_ID,
            item_ID,
            item_name,
            Batch,
            expiry,
            cost_price,
            sell_price,
            note,
            reason_option_id,
            item_variant_id,
            donor_id,
            vvm_status_id,
            volume_per_pack,
            manufacturer_id,
            oms_fields,
        } = serde_json::from_str::<LegacyStocktakeLineRow>(&sync_record.data)?;

        // TODO is this correct?
        let counted_number_of_packs = if is_edited {
            Some(stock_take_qty)
        } else {
            None
        };

        // omSupply should be generating the stocktake line with valid stock lines.
        // Currently a uuid is assigned by central for the stock_line id which causes a foreign
        // key constraint violation; clear_invalid_fk handles the validation + null + system_log.
        let stock_line_id = clear_invalid_fk(
            connection,
            RECORD_TABLE,
            &ID,
            "stock_line_id",
            item_line_ID,
            |c, id| StockLineRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;

        let (campaign_id, program_id, manufacture_date) = oms_fields
            .map(|fields| (fields.campaign_id, fields.program_id, fields.manufacture_date))
            .unwrap_or((None, None, None));

        let location_id = clear_invalid_fk(
            connection,
            RECORD_TABLE,
            &ID,
            "location_id",
            location_id,
            |c, id| LocationRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;
        let item_variant_id = clear_invalid_fk(
            connection,
            RECORD_TABLE,
            &ID,
            "item_variant_id",
            item_variant_id,
            |c, id| ItemVariantRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;
        // No DB-level FK constraint on stocktake_line.vvm_status_id (unlike stock_line/invoice_line), skip validation
        // Note: the DB constraint may be missing from the migration and should be added separately
        let reason_option_id = clear_invalid_fk(
            connection,
            RECORD_TABLE,
            &ID,
            "reason_option_id",
            reason_option_id,
            |c, id| ReasonOptionRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;
        let campaign_id = clear_invalid_fk(
            connection,
            RECORD_TABLE,
            &ID,
            "campaign_id",
            campaign_id,
            |c, id| CampaignRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;
        let program_id = clear_invalid_fk(
            connection,
            RECORD_TABLE,
            &ID,
            "program_id",
            program_id,
            |c, id| ProgramRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;

        let result = StocktakeLineRow {
            id: ID,
            stocktake_id: stock_take_ID,
            stock_line_id,
            location_id,
            comment,
            snapshot_number_of_packs: snapshot_qty,
            counted_number_of_packs,
            item_link_id: item_ID,
            item_name,
            batch: Batch,
            expiry_date: expiry,
            manufacture_date,
            pack_size: Some(snapshot_packsize),
            cost_price_per_pack: Some(cost_price),
            sell_price_per_pack: Some(sell_price),
            note,
            item_variant_id,
            donor_id,
            manufacturer_id,
            reason_option_id,
            vvm_status_id,
            volume_per_pack,
            campaign_id,
            program_id,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Some(stocktake_line) = StocktakeLineRepository::new(connection)
            .query_by_filter(
                StocktakeLineFilter::new()
                    .id(EqualFilter::equal_to(changelog.record_id.to_string())),
                None,
            )?
            .pop()
        else {
            return Err(anyhow::anyhow!("Stocktake row not found"));
        };

        let StocktakeLine {
            line:
                StocktakeLineRow {
                    id,
                    stocktake_id,
                    stock_line_id,
                    location_id,
                    comment,
                    snapshot_number_of_packs,
                    counted_number_of_packs,
                    item_link_id: _,
                    item_name,
                    batch,
                    expiry_date,
                    manufacture_date,
                    pack_size,
                    cost_price_per_pack,
                    sell_price_per_pack,
                    note,
                    item_variant_id,
                    donor_id,
                    manufacturer_id,
                    reason_option_id,
                    vvm_status_id,
                    volume_per_pack,
                    campaign_id,
                    program_id,
                },
            item,
            stock_line,
            ..
        } = stocktake_line;

        let oms_fields = match (&campaign_id, &program_id, &manufacture_date) {
            (None, None, None) => None,
            _ => Some(LegacyStocktakeLineRowOmsFields {
                campaign_id,
                program_id,
                manufacture_date,
            }),
        };

        let legacy_row = LegacyStocktakeLineRow {
            ID: id.clone(),
            stock_take_ID: stocktake_id,
            location_id,
            comment,
            snapshot_qty: snapshot_number_of_packs,
            stock_take_qty: counted_number_of_packs.unwrap_or(0.0),
            is_edited: counted_number_of_packs.is_some(),
            item_line_ID: stock_line_id,
            item_ID: item.id,
            item_name,
            snapshot_packsize: pack_size
                .unwrap_or(stock_line.as_ref().map(|it| it.pack_size).unwrap_or(0.0)),
            Batch: batch,
            expiry: expiry_date,
            cost_price: cost_price_per_pack.unwrap_or(0.0),
            sell_price: sell_price_per_pack.unwrap_or(0.0),
            note,
            reason_option_id,
            item_variant_id,
            donor_id,
            vvm_status_id,
            volume_per_pack,
            manufacturer_id,
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
        campaign_row::CampaignRow,
        mock::{MockData, MockDataInserts},
        system_log_row::{SystemLogRowRepository, SystemLogType},
        test_db::{setup_all, setup_all_with_data},
        vvm_status::vvm_status_row::VVMStatusRow,
        ChangelogFilter, ChangelogRepository, ContextRow, ProgramRow, SyncAction,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_stock_take_line_translation() {
        use crate::sync::test::test_data::stocktake_line as test_data;
        let translator = StocktakeLineTranslation {};

        // Pre-populate FK records that the test data references; without these the FK
        // validation in the translator would null them out.
        let (_, connection, _, _) = setup_all_with_data(
            "test_stock_take_line_translation",
            MockDataInserts::none()
                .stock_lines()
                .units()
                .items()
                .names()
                .locations()
                .stores(),
            MockData {
                contexts: vec![ContextRow {
                    id: "test_ctx".to_string(),
                    name: "test ctx".to_string(),
                }],
                programs: vec![ProgramRow {
                    id: "program_test".to_string(),
                    master_list_id: None,
                    name: "program_test".to_string(),
                    context_id: "test_ctx".to_string(),
                    is_immunisation: false,
                    elmis_code: None,
                    deleted_datetime: None,
                }],
                campaigns: vec![CampaignRow {
                    id: "campaign_a".to_string(),
                    name: "Campaign A".to_string(),
                    ..Default::default()
                }],
                vvm_statuses: vec![VVMStatusRow {
                    id: "VVM_STATUS_1".to_string(),
                    code: "1".to_string(),
                    description: "VVM 1".to_string(),
                    ..Default::default()
                }],
                ..Default::default()
            },
        )
        .await;

        for record in test_data::test_pull_upsert_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_upsert_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    /// When optional FKs reference records that don't exist, the translator should:
    ///  - null out each invalid FK on the translated row
    ///  - write a `system_log` row of type `SyncTranslationFkError` for each invalid FK
    /// so the integration upstream of this translator doesn't fail on FK constraint violations.
    #[actix_rt::test]
    async fn test_stocktake_line_clears_invalid_optional_fks_and_writes_system_log() {
        let translator = StocktakeLineTranslation {};
        let (_, connection, _, _) = setup_all(
            "test_stocktake_line_clears_invalid_optional_fks_and_writes_system_log",
            MockDataInserts::none(),
        )
        .await;

        let sync_record = SyncBufferRow {
            table_name: "Stock_take_lines".to_string(),
            record_id: "STOCKTAKE_LINE_FK_INVALID".to_string(),
            data: r#"{
                "ID": "STOCKTAKE_LINE_FK_INVALID",
                "stock_take_ID": "stocktake_a",
                "Batch": "",
                "comment": "",
                "cost_price": 0,
                "donor_ID": "",
                "expiry": "0000-00-00",
                "is_edited": false,
                "item_ID": "item_a",
                "item_name": "Item A",
                "item_line_ID": "",
                "location_id": "does_not_exist_location",
                "optionID": "does_not_exist_reason_option",
                "sell_price": 0,
                "snapshot_packsize": 1,
                "snapshot_qty": 1,
                "stock_take_qty": 0,
                "vaccine_vial_monitor_status_ID": "does_not_exist_vvm",
                "om_item_variant_id": "does_not_exist_item_variant",
                "volume_per_pack": 0,
                "oms_fields": {
                    "campaign_id": "does_not_exist_campaign",
                    "program_id": "does_not_exist_program"
                }
            }"#
            .to_string(),
            action: SyncAction::Upsert,
            ..Default::default()
        };

        let result = translator
            .try_translate_from_upsert_sync_record(&connection, &sync_record)
            .unwrap();

        let expected = PullTranslateResult::upsert(StocktakeLineRow {
            id: "STOCKTAKE_LINE_FK_INVALID".to_string(),
            stocktake_id: "stocktake_a".to_string(),
            stock_line_id: None,
            location_id: None,
            comment: None,
            snapshot_number_of_packs: 1.0,
            counted_number_of_packs: None,
            item_link_id: "item_a".to_string(),
            item_name: "Item A".to_string(),
            batch: None,
            expiry_date: None,
            pack_size: Some(1.0),
            cost_price_per_pack: Some(0.0),
            sell_price_per_pack: Some(0.0),
            note: None,
            item_variant_id: None,
            donor_id: None,
            manufacturer_id: None,
            manufacture_date: None,
            reason_option_id: None,
            vvm_status_id: Some("does_not_exist_vvm".to_string()),
            volume_per_pack: 0.0,
            campaign_id: None,
            program_id: None,
        });
        assert_eq!(result, expected);

        let logs = SystemLogRowRepository::new(&connection)
            .find_all()
            .unwrap();
        let fk_errors: Vec<_> = logs
            .iter()
            .filter(|l| l.r#type == SystemLogType::SyncTranslationFkError && l.is_error)
            .collect();
        // location_id, item_variant_id, reason_option_id, campaign_id, program_id
        // (vvm_status_id skipped — no DB-level FK constraint)
        assert_eq!(fk_errors.len(), 5, "got {fk_errors:?}");
        let messages: String = fk_errors
            .iter()
            .filter_map(|l| l.message.as_deref())
            .collect::<Vec<_>>()
            .join("\n");
        for fk_field in [
            "location_id",
            "item_variant_id",
            "reason_option_id",
            "campaign_id",
            "program_id",
        ] {
            assert!(
                messages.contains(fk_field),
                "{}",
                format!("expected message to mention {fk_field}; got:\n{messages}")
            );
            assert!(
                messages.contains("STOCKTAKE_LINE_FK_INVALID"),
                "expected message to include the record id"
            );
        }
    }

    #[actix_rt::test]
    async fn test_stocktake_line_push_merged() {
        // The item_links_merged function will merge ALL items into item_a, so all stocktake_lines should have an item_id of "item_a" regardless of their original item_id.
        let (mock_data, connection, _, _) = setup_all(
            "test_stocktake_line_push_item_link_merged",
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
                    ChangelogFilter::new().table_name(ChangelogTableName::StocktakeLine.equal_to()),
                ),
            )
            .unwrap();

        let translator = StocktakeLineTranslation {};
        for changelog in changelogs {
            // Translate and sort
            // Translate and sort
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
