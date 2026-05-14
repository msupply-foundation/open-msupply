use crate::sync::translations::{
    currency::CurrencyTranslation, invoice::InvoiceTranslation, item::ItemTranslation,
    item_variant::ItemVariantTranslation, location::LocationTranslation, reason::ReasonTranslation,
    stock_line::StockLineTranslation,
};

use chrono::NaiveDate;
use repository::{
    campaign_row::CampaignRowRepository, item_variant::item_variant_row::ItemVariantRowRepository,
    vvm_status::vvm_status_row::VVMStatusRowRepository, ChangelogRow, ChangelogTableName,
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    InvoiceLineRowDelete, InvoiceLineStatus, InvoiceLineType, InvoiceRowRepository, InvoiceType,
    ItemRowRepository,
    LocationRowRepository, ProgramRowRepository, ReasonOptionRowRepository, StockLineRowRepository,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{
    date_option_to_isostring, empty_str_as_option_string, object_fields_as_option,
    zero_date_as_option,
};

use super::{
    is_active_record_on_site, utils::clear_invalid_fk, ActiveRecordCheck, PullTranslateResult,
    PushTranslateResult, SyncTranslation,
};

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyTransLineType {
    #[serde(rename = "stock_in")]
    StockIn,
    #[serde(rename = "stock_out")]
    StockOut,
    #[serde(rename = "placeholder")]
    Placeholder,
    #[serde(rename = "service")]
    Service,
    /// Bucket to catch all other variants
    /// E.g. "non_stock"
    #[serde(other)]
    Others,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, Default)]
pub struct TransLineRowOmsFields {
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub campaign_id: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub program_id: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub manufacture_date: Option<NaiveDate>,
    #[serde(default)]
    pub purchase_order_line_id: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize)]
pub struct LegacyTransLineRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "transaction_ID")]
    pub invoice_id: String,
    #[serde(rename = "item_ID")]
    pub item_id: String,
    pub item_name: String,
    #[serde(rename = "item_line_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub stock_line_id: Option<String>,
    #[serde(rename = "location_ID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub location_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub batch: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: f64,
    #[serde(rename = "cost_price")]
    pub cost_price_per_pack: f64,
    #[serde(rename = "sell_price")]
    pub sell_price_per_pack: f64,
    #[serde(rename = "type")]
    pub r#type: LegacyTransLineType,
    #[serde(rename = "quantity")]
    pub number_of_packs: f64,
    #[serde(rename = "prescribedQuantity")]
    pub prescribed_quantity: Option<f64>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub note: Option<String>,

    #[serde(rename = "om_item_code")]
    pub item_code: Option<String>,
    #[serde(rename = "om_tax")]
    pub tax_percentage: Option<f64>,
    #[serde(rename = "om_total_before_tax")]
    pub total_before_tax: Option<f64>,
    #[serde(rename = "om_total_after_tax")]
    pub total_after_tax: Option<f64>,
    #[serde(rename = "optionID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub reason_option_id: Option<String>,
    #[serde(rename = "foreign_currency_price")]
    pub foreign_currency_price_before_tax: Option<f64>,
    #[serde(
        rename = "om_item_variant_id",
        default,
        deserialize_with = "empty_str_as_option_string"
    )]
    pub item_variant_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "linked_transact_id")]
    pub linked_invoice_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub donor_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "vaccine_vial_monitor_status_ID")]
    pub vvm_status_id: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "object_fields_as_option")]
    pub oms_fields: Option<TransLineRowOmsFields>,
    #[serde(rename = "sentQuantity")]
    pub shipped_number_of_packs: Option<f64>,
    pub volume_per_pack: f64,
    #[serde(rename = "sent_pack_size")]
    pub shipped_pack_size: Option<f64>,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    #[serde(rename = "manufacturer_ID")]
    #[serde(default)]
    pub manufacturer_id: Option<String>,
}

// Needs to be added to all_translators()
#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(InvoiceLineTranslation)
}

pub(super) struct InvoiceLineTranslation;
impl SyncTranslation for InvoiceLineTranslation {
    fn table_name(&self) -> &str {
        "trans_line"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            InvoiceTranslation.table_name(),
            ItemTranslation.table_name(),
            ItemVariantTranslation.table_name(),
            StockLineTranslation.table_name(),
            LocationTranslation.table_name(),
            ReasonTranslation.table_name(),
            CurrencyTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::InvoiceLine)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let LegacyTransLineRow {
            id,
            invoice_id,
            item_id,
            item_name,
            stock_line_id,
            location_id,
            batch,
            expiry_date,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            r#type,
            number_of_packs,
            prescribed_quantity,
            note,
            item_code,
            tax_percentage,
            total_before_tax,
            total_after_tax,
            reason_option_id,
            foreign_currency_price_before_tax,
            item_variant_id,
            linked_invoice_id,
            donor_id,
            vvm_status_id,
            oms_fields,
            shipped_number_of_packs,
            volume_per_pack,
            shipped_pack_size,
            manufacturer_id,
        } = serde_json::from_str::<LegacyTransLineRow>(&sync_record.data)?;

        let line_type = match to_invoice_line_type(&r#type) {
            Some(line_type) => line_type,
            None => {
                return Ok(PullTranslateResult::Ignored(format!(
                    "Unsupported line type {:?}",
                    r#type
                )))
            }
        };

        let invoice = match InvoiceRowRepository::new(connection).find_one_by_id(&invoice_id)? {
            Some(invoice) => invoice,
            None => {
                return Err(anyhow::Error::msg(format!(
                    "Failed to get invoice: {}",
                    invoice_id
                )))
            }
        };

        let item_code = item_code.unwrap_or("".to_string());
        let (item_code, tax_percentage, total_before_tax, total_after_tax) = match item_code
            .is_empty()
        {
            false => {
                // use new om_* fields
                (
                    item_code,
                    tax_percentage,
                    total_before_tax.unwrap_or(0.0),
                    total_after_tax.unwrap_or(0.0),
                )
            }
            true => {
                let item = match ItemRowRepository::new(connection).find_active_by_id(&item_id)? {
                    Some(item) => item,
                    None => {
                        return Err(anyhow::Error::msg(format!(
                            "Failed to get item: {}",
                            item_id
                        )))
                    }
                };
                let total_multiplier = match r#type {
                    LegacyTransLineType::StockIn => cost_price_per_pack,
                    LegacyTransLineType::StockOut => sell_price_per_pack,
                    LegacyTransLineType::Service
                        if invoice.r#type == InvoiceType::InboundShipment =>
                    {
                        cost_price_per_pack
                    }
                    LegacyTransLineType::Service
                        if invoice.r#type == InvoiceType::OutboundShipment =>
                    {
                        sell_price_per_pack
                    }
                    _ => 0.0,
                };

                let total = total_multiplier * number_of_packs;
                (item.code, None, total, total)
            }
        };

        let is_record_active_on_site = is_active_record_on_site(
            connection,
            ActiveRecordCheck::InvoiceLine {
                invoice_id: invoice_id.clone(),
            },
        )?;

        // On a remote site, foreign-site invoice lines arrive without their stock lines or
        // locations (those records belong to the other site). On OMS central all site data is
        // present, so the FK may well exist. In both cases: keep the link if the record exists
        // locally, null it if it doesn't. Only log an error for records this site owns —
        // a missing FK on a foreign-site record is expected, not operator-actionable.
        // TODO: remove the stock_line FK validation once central server does not generate the
        // inbound shipment — omSupply should be generating the inbound with valid stock lines.
        // Currently a uuid is assigned by central for the stock_line id which causes a foreign
        // key constraint violation, so we still need this for active-on-site records.
        let stock_line_id = clear_invalid_fk(
            connection,
            "invoice_line",
            &id,
            "stock_line_id",
            stock_line_id,
            |c, id| StockLineRowRepository::new(c).check_exists_by_id(id),
            is_record_active_on_site,
        )?;
        let location_id = clear_invalid_fk(
            connection,
            "invoice_line",
            &id,
            "location_id",
            location_id,
            |c, id| LocationRowRepository::new(c).check_exists_by_id(id),
            is_record_active_on_site,
        )?;

        let item_variant_id = clear_invalid_fk(
            connection,
            "invoice_line",
            &id,
            "item_variant_id",
            item_variant_id,
            |c, id| ItemVariantRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;
        let vvm_status_id = clear_invalid_fk(
            connection,
            "invoice_line",
            &id,
            "vvm_status_id",
            vvm_status_id,
            |c, id| VVMStatusRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;

        // "0" is a sentinel value used by OG for "no option set" — treat it as None before
        // the FK validation so we don't write a system_log entry for the sentinel.
        let reason_option_id = reason_option_id.and_then(|reason_option_id| {
            if reason_option_id == "0" {
                None
            } else {
                Some(reason_option_id)
            }
        });
        let reason_option_id = clear_invalid_fk(
            connection,
            "invoice_line",
            &id,
            "reason_option_id",
            reason_option_id,
            |c, id| ReasonOptionRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;

        let TransLineRowOmsFields {
            campaign_id,
            program_id,
            status,
            manufacture_date,
            purchase_order_line_id,
        } = oms_fields.unwrap_or_default();

        let campaign_id = clear_invalid_fk(
            connection,
            "invoice_line",
            &id,
            "campaign_id",
            campaign_id,
            |c, id| CampaignRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;
        let program_id = clear_invalid_fk(
            connection,
            "invoice_line",
            &id,
            "program_id",
            program_id,
            |c, id| ProgramRowRepository::new(c).check_exists_by_id(id),
            true,
        )?;

        let result = InvoiceLineRow {
            id,
            invoice_id,
            item_id: item_id,
            item_name,
            item_code,
            stock_line_id,
            location_id,
            batch,
            expiry_date,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            total_before_tax,
            total_after_tax,
            tax_percentage,
            r#type: line_type,
            number_of_packs,
            prescribed_quantity,
            note,
            foreign_currency_price_before_tax,
            item_variant_id,
            linked_invoice_id,
            donor_id,
            reason_option_id,
            vvm_status_id,
            campaign_id,
            program_id,
            shipped_number_of_packs,
            volume_per_pack,
            shipped_pack_size,
            status: match status.as_deref() {
                Some("PENDING") => Some(InvoiceLineStatus::Pending),
                Some("PASSED") => Some(InvoiceLineStatus::Passed),
                Some("REJECTED") => Some(InvoiceLineStatus::Rejected),
                _ => None,
            },
            manufacture_date,
            purchase_order_line_id,
            manufacturer_id,
        };

        let result = adjust_negative_values(result);

        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        // TODO, check site ? (should never get delete records for this site, only transfer other half)
        Ok(PullTranslateResult::delete(InvoiceLineRowDelete(
            sync_record.record_id.clone(),
        )))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let Some(invoice_line) = InvoiceLineRepository::new(connection).query_one(
            InvoiceLineFilter::new().id(EqualFilter::equal_to(changelog.record_id.to_string())),
        )?
        else {
            return Err(anyhow::anyhow!("invoice_line row not found"));
        };

        let InvoiceLine {
            invoice_line_row:
                InvoiceLineRow {
                    id,
                    invoice_id,
                    item_id: _,
                    item_name,
                    item_code,
                    stock_line_id,
                    location_id,
                    batch,
                    expiry_date,
                    pack_size,
                    cost_price_per_pack,
                    sell_price_per_pack,
                    total_before_tax,
                    total_after_tax,
                    tax_percentage,
                    r#type,
                    number_of_packs,
                    prescribed_quantity,
                    note,
                    foreign_currency_price_before_tax,
                    item_variant_id,
                    linked_invoice_id,
                    donor_id,
                    vvm_status_id,
                    reason_option_id,
                    campaign_id,
                    program_id,
                    shipped_number_of_packs,
                    volume_per_pack,
                    shipped_pack_size,
                    status,
                    manufacture_date,
                    purchase_order_line_id,
                    manufacturer_id,
                },
            item_row,
            ..
        } = invoice_line;

        let oms_fields = Some(TransLineRowOmsFields {
            campaign_id,
            program_id,
            status: match status {
                Some(InvoiceLineStatus::Pending) => Some("PENDING".to_string()),
                Some(InvoiceLineStatus::Passed) => Some("PASSED".to_string()),
                Some(InvoiceLineStatus::Rejected) => Some("REJECTED".to_string()),
                None => None,
            },
            manufacture_date,
            purchase_order_line_id,
        });

        let legacy_row = LegacyTransLineRow {
            id: id.clone(),
            invoice_id,
            item_id: item_row.id,
            item_name,
            stock_line_id,
            location_id,
            batch,
            expiry_date,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            r#type: to_legacy_invoice_line_type(&r#type),
            number_of_packs,
            prescribed_quantity,
            note,
            item_code: Some(item_code),
            tax_percentage,
            total_before_tax: Some(total_before_tax),
            total_after_tax: Some(total_after_tax),
            foreign_currency_price_before_tax,
            item_variant_id,
            reason_option_id,
            linked_invoice_id,
            donor_id,
            vvm_status_id,
            oms_fields,
            shipped_number_of_packs,
            volume_per_pack,
            shipped_pack_size,
            manufacturer_id,
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

fn to_invoice_line_type(_type: &LegacyTransLineType) -> Option<InvoiceLineType> {
    let invoice_line_type = match _type {
        LegacyTransLineType::StockIn => InvoiceLineType::StockIn,
        LegacyTransLineType::StockOut => InvoiceLineType::StockOut,
        LegacyTransLineType::Placeholder => InvoiceLineType::UnallocatedStock,
        LegacyTransLineType::Service => InvoiceLineType::Service,
        _ => return None,
    };
    Some(invoice_line_type)
}

fn to_legacy_invoice_line_type(_type: &InvoiceLineType) -> LegacyTransLineType {
    match _type {
        InvoiceLineType::StockIn => LegacyTransLineType::StockIn,
        InvoiceLineType::StockOut => LegacyTransLineType::StockOut,
        InvoiceLineType::UnallocatedStock => LegacyTransLineType::Placeholder,
        InvoiceLineType::Service => LegacyTransLineType::Service,
    }
}

/// If you cancel invoice in mSupply it would create negative values in outbound shipment
/// in omSupply number of packs should always be positive and r#type would determine stock movement direction
fn adjust_negative_values(line: InvoiceLineRow) -> InvoiceLineRow {
    if line.number_of_packs >= 0.0 {
        return line;
    }

    InvoiceLineRow {
        cost_price_per_pack: line.cost_price_per_pack.abs(),
        sell_price_per_pack: line.sell_price_per_pack.abs(),
        total_before_tax: line.total_before_tax.abs(),
        total_after_tax: line.total_after_tax.abs(),
        number_of_packs: line.number_of_packs.abs(),
        foreign_currency_price_before_tax: line.foreign_currency_price_before_tax.map(|n| n.abs()),
        r#type: InvoiceLineType::StockIn,
        ..line
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::{
        test::merge_helpers::merge_all_item_links, translations::ToSyncRecordTranslationType,
    };

    use super::*;
    use chrono::NaiveDateTime;
    use repository::{
        campaign_row::CampaignRow,
        item_variant::item_variant_row::ItemVariantRow,
        mock::{mock_item_a, mock_outbound_shipment_a, mock_store_b, MockData, MockDataInserts},
        system_log_row::{SystemLogRowRepository, SystemLogType},
        test_db::{setup_all, setup_all_with_data},
        ChangelogFilter, ChangelogRepository, ContextRow, KeyType, KeyValueStoreRow, ProgramRow,
        SyncAction,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_invoice_line_translation() {
        use crate::sync::test::test_data::invoice_line as test_data;
        let translator = InvoiceLineTranslation {};

        let (_, connection, _, _) = setup_all_with_data(
            "test_invoice_line_translation",
            MockDataInserts::none()
                .units()
                .items()
                .names()
                .stores()
                .locations()
                .stock_lines()
                .currencies(),
            MockData {
                invoices: vec![mock_outbound_shipment_a()],
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
                item_variants: vec![ItemVariantRow {
                    id: "5fb99f9c-03f4-47f2-965b-c9ecd083c675".to_string(),
                    name: "test variant".to_string(),
                    item_link_id: mock_item_a().id,
                    location_type_id: None,
                    manufacturer_id: None,
                    deleted_datetime: None,
                    vvm_type: None,
                    created_datetime: NaiveDateTime::default(),
                    created_by: None,
                }],
                key_value_store_rows: vec![KeyValueStoreRow {
                    id: KeyType::SettingsSyncSiteId,
                    value_int: Some(mock_store_b().site_id),
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

        for record in test_data::test_pull_delete_records() {
            assert!(translator.should_translate_from_sync_record(&record.sync_buffer_row));
            let translation_result = translator
                .try_translate_from_delete_sync_record(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }

    #[actix_rt::test]
    async fn test_invoice_line_push_merged() {
        // The item_links_merged function will merge ALL items into item_a, so all invoice_lines should have an item_id of "item_a" regardless of their original item_id.
        let (mock_data, connection, _, _) = setup_all(
            "test_invoice_line_push_item_link_merged",
            MockDataInserts::all(),
        )
        .await;

        merge_all_item_links(&connection, &mock_data).unwrap();

        let repo = ChangelogRepository::new(&connection);
        let changelogs = repo
            .changelogs(
                0,
                1_000_000,
                Some(ChangelogFilter::new().table_name(ChangelogTableName::InvoiceLine.equal_to())),
            )
            .unwrap();

        let translator = InvoiceLineTranslation {};
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

    /// When optional FKs reference records that don't exist, the translator should
    /// null each one and write a `system_log` row per missing FK. The active-on-site
    /// gate (which can also null `stock_line_id`) is exercised by the happy-path test.
    #[actix_rt::test]
    async fn test_invoice_line_clears_invalid_optional_fks_and_writes_system_log() {
        let translator = InvoiceLineTranslation {};
        let (_, connection, _, _) = setup_all_with_data(
            "test_invoice_line_clears_invalid_optional_fks_and_writes_system_log",
            MockDataInserts::none()
                .units()
                .items()
                .names()
                .stores()
                .currencies(),
            // mock_outbound_shipment_a is on store_b, and we tell the test that this site IS
            // store_b's site, so is_active_record_on_site returns true. That isolates the FK
            // validation as the only reason these FKs would get cleared.
            MockData {
                invoices: vec![mock_outbound_shipment_a()],
                key_value_store_rows: vec![KeyValueStoreRow {
                    id: KeyType::SettingsSyncSiteId,
                    value_int: Some(mock_store_b().site_id),
                    ..Default::default()
                }],
                ..Default::default()
            },
        )
        .await;

        let sync_record = SyncBufferRow {
            table_name: "trans_line".to_string(),
            record_id: "TRANS_LINE_FK_INVALID".to_string(),
            data: r#"{
                "ID": "TRANS_LINE_FK_INVALID",
                "transaction_ID": "outbound_shipment_a",
                "item_ID": "item_a",
                "item_name": "Item A",
                "item_line_ID": "does_not_exist_stock_line",
                "batch": "",
                "expiry_date": "0000-00-00",
                "pack_size": 1,
                "cost_price": 10,
                "sell_price": 0,
                "quantity": 1,
                "type": "stock_in",
                "barcodeID": "",
                "location_ID": "",
                "note": "",
                "optionID": "does_not_exist_reason",
                "vaccine_vial_monitor_status_ID": "does_not_exist_vvm",
                "om_item_variant_id": "does_not_exist_item_variant",
                "donor_id": "",
                "linked_trans_line_ID": "",
                "linked_transact_id": "",
                "volume_per_pack": 0,
                "foreign_currency_price": 0,
                "is_from_inventory_adjustment": true,
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

        let PullTranslateResult::IntegrationOperations(ops) = result else {
            panic!("{}", format!("expected IntegrationOperations, got {result:?}"));
        };
        let debug = format!("{ops:?}");
        for (field, _id) in [
            ("stock_line_id", "does_not_exist_stock_line"),
            ("item_variant_id", "does_not_exist_item_variant"),
            ("vvm_status_id", "does_not_exist_vvm"),
            ("reason_option_id", "does_not_exist_reason"),
            ("campaign_id", "does_not_exist_campaign"),
            ("program_id", "does_not_exist_program"),
        ] {
            let needle = format!("{field}: None");
            assert!(
                debug.contains(&needle),
                "{}",
                format!("expected {field} to be cleared; got:\n{debug}")
            );
        }

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
            "stock_line_id",
            "item_variant_id",
            "vvm_status_id",
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
                messages.contains("TRANS_LINE_FK_INVALID"),
                "expected message to mention the record id"
            );
        }
    }
}
