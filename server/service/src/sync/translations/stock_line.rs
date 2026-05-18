use crate::sync::translations::{
    barcode::BarcodeTranslation, campaign::CampaignTranslation, item::ItemTranslation,
    item_variant::ItemVariantTranslation, location::LocationTranslation, name::NameTranslation,
    store::StoreTranslation, vvm_status::VVMStatusTranslation,
};

use chrono::NaiveDate;
use repository::{
    campaign_row::CampaignRowRepository, item_variant::item_variant_row::ItemVariantRowRepository,
    vvm_status::vvm_status_row::VVMStatusRowRepository, BarcodeRowRepository, ChangelogRow,
    ChangelogTableName, EqualFilter, LocationRowRepository, ProgramRowRepository, StockLine,
    StockLineFilter, StockLineRepository, StockLineRow, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{
    date_option_to_isostring, empty_str_as_option_string, object_fields_as_option,
    zero_date_as_option,
};

use super::{utils::clear_invalid_fk, PullTranslateResult, PushTranslateResult, SyncTranslation};

const RECORD_TABLE: &str = "stock_line";

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, Default)]
pub struct StockLineRowOmsFields {
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
pub struct LegacyStockLineRow {
    pub ID: String,
    pub store_ID: String,
    pub item_ID: String,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub batch: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub expiry_date: Option<NaiveDate>,
    pub hold: bool,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub location_ID: Option<String>,
    pub pack_size: f64,
    pub available: f64,
    pub quantity: f64,
    pub cost_price: f64,
    pub sell_price: f64,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub note: Option<String>,
    #[serde(rename = "name_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub supplier_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string", rename = "barcodeID")]
    pub barcode_id: Option<String>,
    #[serde(rename = "om_item_variant_id")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(default)]
    pub item_variant_id: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub donor_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub vvm_status_id: Option<String>,
    #[serde(rename = "manufacturer_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(default)]
    pub manufacturer_id: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "object_fields_as_option")]
    pub oms_fields: Option<StockLineRowOmsFields>,
    pub total_volume: f64,
    pub volume_per_pack: f64,
}
// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(StockLineTranslation)
}

pub(super) struct StockLineTranslation;
impl SyncTranslation for StockLineTranslation {
    fn table_name(&self) -> &str {
        "item_line"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            ItemTranslation.table_name(),
            ItemVariantTranslation.table_name(),
            NameTranslation.table_name(),
            StoreTranslation.table_name(),
            LocationTranslation.table_name(),
            BarcodeTranslation.table_name(),
            VVMStatusTranslation.table_name(),
            CampaignTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::StockLine)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyStockLineRow {
            ID,
            store_ID,
            item_ID,
            batch,
            expiry_date,
            hold,
            location_ID,
            pack_size,
            available,
            quantity,
            cost_price,
            sell_price,
            note,
            supplier_id,
            barcode_id,
            item_variant_id,
            donor_id,
            vvm_status_id,
            manufacturer_id,
            oms_fields,
            total_volume,
            volume_per_pack,
        } = serde_json::from_str::<LegacyStockLineRow>(&sync_record.data)?;

        let barcode_id = clear_invalid_fk(
            connection,
            RECORD_TABLE,
            &ID,
            "barcode_id",
            barcode_id,
            |c, id| BarcodeRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;
        let location_id = clear_invalid_fk(
            connection,
            RECORD_TABLE,
            &ID,
            "location_id",
            location_ID,
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
        let vvm_status_id = clear_invalid_fk(
            connection,
            RECORD_TABLE,
            &ID,
            "vvm_status_id",
            vvm_status_id,
            |c, id| VVMStatusRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;

        let StockLineRowOmsFields {
            campaign_id,
            program_id,
            manufacture_date,
        } = oms_fields.unwrap_or_default();

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

        let result = StockLineRow {
            id: ID,
            store_id: store_ID,
            item_link_id: item_ID,
            location_id,
            batch,
            pack_size,
            cost_price_per_pack: cost_price,
            sell_price_per_pack: sell_price,
            available_number_of_packs: available,
            total_number_of_packs: quantity,
            expiry_date,
            on_hold: hold,
            note,
            supplier_id,
            barcode_id,
            item_variant_id,
            donor_id,
            manufacturer_id,
            vvm_status_id,
            campaign_id,
            program_id,
            manufacture_date,
            total_volume,
            volume_per_pack,
        };

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Some(stock_line) = StockLineRepository::new(connection)
            .query_by_filter(
                StockLineFilter::new().id(EqualFilter::equal_to(changelog.record_id.to_string())),
                None,
            )?
            .pop()
        else {
            return Err(anyhow::anyhow!("Stock_line row not found"));
        };

        let StockLine {
            stock_line_row:
                StockLineRow {
                    id,
                    item_link_id: _,
                    store_id,
                    location_id,
                    batch,
                    pack_size,
                    cost_price_per_pack,
                    sell_price_per_pack,
                    available_number_of_packs,
                    total_number_of_packs,
                    expiry_date,
                    on_hold,
                    note,
                    supplier_id: _,
                    barcode_id,
                    item_variant_id,
                    donor_id: donor_link_id,
                    manufacturer_id,
                    vvm_status_id,
                    campaign_id,
                    program_id,
                    manufacture_date,
                    total_volume,
                    volume_per_pack,
                },
            item_row,
            supplier_name_row,
            ..
        } = stock_line;

        let oms_fields = Some(StockLineRowOmsFields {
            campaign_id,
            program_id,
            manufacture_date,
        });

        let legacy_row = LegacyStockLineRow {
            ID: id,
            store_ID: store_id,
            item_ID: item_row.id,
            batch,
            expiry_date,
            hold: on_hold,
            location_ID: location_id,
            pack_size,
            available: available_number_of_packs,
            quantity: total_number_of_packs,
            cost_price: cost_price_per_pack,
            sell_price: sell_price_per_pack,
            note,
            supplier_id: supplier_name_row.map(|supplier| supplier.id),
            barcode_id,
            item_variant_id,
            donor_id: donor_link_id,
            vvm_status_id,
            manufacturer_id,
            oms_fields,
            total_volume,
            volume_per_pack,
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
        test::merge_helpers::{merge_all_item_links, merge_all_name_links},
        translations::ToSyncRecordTranslationType,
    };

    use super::*;
    use repository::{
        campaign_row::CampaignRow,
        mock::{MockData, MockDataInserts},
        system_log_row::{SystemLogRowRepository, SystemLogType},
        test_db::{setup_all, setup_all_with_data},
        ChangelogFilter, ChangelogRepository, ContextRow, ProgramRow, SyncAction,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_stock_line_translation() {
        use crate::sync::test::test_data::stock_line as test_data;
        let translator = StockLineTranslation {};

        // Pre-populate program_a and campaign_a (referenced by ITEM_LINE_1 in test data)
        // so that FK validation in the translator doesn't null them out.
        let (_, connection, _, _) = setup_all_with_data(
            "test_stock_line_translation",
            MockDataInserts::none(),
            MockData {
                contexts: vec![ContextRow {
                    id: "test_ctx".to_string(),
                    name: "test ctx".to_string(),
                }],
                programs: vec![ProgramRow {
                    id: "program_a".to_string(),
                    master_list_id: None,
                    name: "program_a".to_string(),
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
    async fn test_stock_line_clears_invalid_optional_fks_and_writes_system_log() {
        let translator = StockLineTranslation {};
        let (_, connection, _, _) = setup_all(
            "test_stock_line_clears_invalid_optional_fks_and_writes_system_log",
            MockDataInserts::none(),
        )
        .await;

        let sync_record = SyncBufferRow {
            table_name: "item_line".to_string(),
            record_id: "ITEM_LINE_FK_INVALID".to_string(),
            data: r#"{
                "ID": "ITEM_LINE_FK_INVALID",
                "store_ID": "store_a",
                "item_ID": "item_a",
                "available": 1.0,
                "barcodeID": "missing_barcode",
                "batch": "",
                "cost_price": 0,
                "expiry_date": "0000-00-00",
                "hold": false,
                "location_ID": "missing_location",
                "name_ID": "",
                "note": "",
                "pack_size": 1,
                "quantity": 1,
                "sell_price": 0,
                "total_volume": 0,
                "volume_per_pack": 0,
                "vvm_status_id": "missing_vvm",
                "om_item_variant_id": "missing_item_variant",
                "oms_fields": {
                    "campaign_id": "missing_campaign",
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

        let expected = PullTranslateResult::upsert(StockLineRow {
            id: "ITEM_LINE_FK_INVALID".to_string(),
            store_id: "store_a".to_string(),
            item_link_id: "item_a".to_string(),
            location_id: None,
            batch: None,
            pack_size: 1.0,
            cost_price_per_pack: 0.0,
            sell_price_per_pack: 0.0,
            available_number_of_packs: 1.0,
            total_number_of_packs: 1.0,
            expiry_date: None,
            on_hold: false,
            note: None,
            supplier_id: None,
            barcode_id: None,
            item_variant_id: None,
            donor_id: None,
            manufacturer_id: None,
            manufacture_date: None,
            vvm_status_id: None,
            campaign_id: None,
            program_id: None,
            volume_per_pack: 0.0,
            total_volume: 0.0,
        });
        assert_eq!(result, expected);

        // One system_log entry per invalid FK
        let logs = SystemLogRowRepository::new(&connection)
            .find_all()
            .unwrap();
        let fk_errors: Vec<_> = logs
            .iter()
            .filter(|l| l.r#type == SystemLogType::SyncTranslationFkError && l.is_error)
            .collect();
        assert_eq!(fk_errors.len(), 6, "got {fk_errors:?}");
        let messages: String = fk_errors
            .iter()
            .filter_map(|l| l.message.as_deref())
            .collect::<Vec<_>>()
            .join("\n");
        for fk_field in [
            "barcode_id",
            "location_id",
            "item_variant_id",
            "vvm_status_id",
            "campaign_id",
            "program_id",
        ] {
            assert!(
                messages.contains(fk_field),
                "{}",
                format!("expected message to mention {fk_field}; got:\n{messages}")
            );
            assert!(
                messages.contains("ITEM_LINE_FK_INVALID"),
                "expected message to include the record id"
            );
        }
    }

    #[actix_rt::test]
    async fn test_stock_line_push_merged() {
        // The item_links_merged function will merge ALL items into item_a, so all stock_lines should have an item_id of "item_a" regardless of their original item_id.
        let (mock_data, connection, _, _) =
            setup_all("test_stock_line_push_link_merged", MockDataInserts::all()).await;

        merge_all_item_links(&connection, &mock_data).unwrap();
        merge_all_name_links(&connection, &mock_data).unwrap();

        let repo = ChangelogRepository::new(&connection);
        let changelogs = repo
            .changelogs(
                0,
                1_000_000,
                Some(ChangelogFilter::new().table_name(ChangelogTableName::StockLine.equal_to())),
            )
            .unwrap();

        let translator = StockLineTranslation {};
        for changelog in changelogs {
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

            // Supplier ID can be null. We want to check if the non-null supplier_ids is "name_a".
            if translated[0].record.record_data["name_ID"] != json!(null) {
                assert_eq!(translated[0].record.record_data["name_ID"], json!("name_a"));
            }
        }
    }
}
