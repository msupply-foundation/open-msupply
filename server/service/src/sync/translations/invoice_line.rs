use crate::sync::{
    api::RemoteSyncRecordV5,
    sync_serde::{date_option_to_isostring, empty_str_as_option_string, zero_date_as_option},
};
use chrono::NaiveDate;
use repository::{
    ChangelogRow, ChangelogTableName, InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineRowType,
    ItemRowRepository, StockLineRowRepository, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{
    is_active_record_on_site, ActiveRecordCheck, IntegrationRecords, LegacyTableName,
    PullDeleteRecordTable, PullUpsertRecord, SyncTranslation,
};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::TRANS_LINE;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::InvoiceLine
}

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
    pub pack_size: i32,
    #[serde(rename = "cost_price")]
    pub cost_price_per_pack: f64,
    #[serde(rename = "sell_price")]
    pub sell_price_per_pack: f64,
    #[serde(rename = "type")]
    pub r#type: LegacyTransLineType,
    #[serde(rename = "quantity")]
    pub number_of_packs: f64,
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub note: Option<String>,

    #[serde(rename = "om_item_code")]
    pub item_code: Option<String>,
    #[serde(rename = "om_tax")]
    pub tax: Option<f64>,
    #[serde(rename = "om_total_before_tax")]
    pub total_before_tax: Option<f64>,
    #[serde(rename = "om_total_after_tax")]
    pub total_after_tax: Option<f64>,
    #[serde(rename = "optionID")]
    #[serde(deserialize_with = "empty_str_as_option_string")]
    pub inventory_adjustment_reason_id: Option<String>,
}

pub(crate) struct InvoiceLineTranslation {}
impl SyncTranslation for InvoiceLineTranslation {
    fn try_translate_pull_upsert(
        &self,
        connection: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

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
            note,
            item_code,
            tax,
            total_before_tax,
            total_after_tax,
            inventory_adjustment_reason_id,
        } = serde_json::from_str::<LegacyTransLineRow>(&sync_record.data)?;

        let line_type = to_invoice_line_type(&r#type).ok_or(anyhow::Error::msg(format!(
            "Unsupported trans_line type: {:?}",
            r#type
        )))?;

        let (item_code, tax, total_before_tax, total_after_tax) = match item_code {
            Some(item_code) => {
                // use new om_* fields
                (
                    item_code,
                    tax,
                    total_before_tax.unwrap_or(0.0),
                    total_after_tax.unwrap_or(0.0),
                )
            }
            None => {
                let item = match ItemRowRepository::new(connection).find_one_by_id(&item_id)? {
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
                    _ => 0.0,
                };

                let total = total_multiplier * number_of_packs as f64;
                (item.code, None, total, total)
            }
        };

        let is_record_active_on_site = is_active_record_on_site(
            &connection,
            ActiveRecordCheck::InvoiceLine {
                invoice_id: invoice_id.clone(),
            },
        )?;

        // TODO: remove the stock_line_is_valid check once central server does not generate the inbound shipment
        // omSupply should be generating the inbound, with valid stock lines.
        // Currently a uuid is assigned by central for the stock_line id which causes a foreign key constraint violation
        let is_stock_line_valid = match stock_line_id {
            Some(ref stock_line_id) => StockLineRowRepository::new(connection)
                .find_one_by_id(&stock_line_id)
                .is_ok(),
            None => false,
        };

        if !is_stock_line_valid {
            log::warn!(
                "Stock line is not valid, invoice_line_id: {}, stock_line_id: {:?}",
                id,
                stock_line_id
            );
        }

        // When invoice lines are coming from another site, we don't get stock line and location
        // so foreign key constraint is violated, thus we want to set them to None if it's foreign site record.
        // If the invoice is an auto generated inbound shipment, then the stock_lines are not valid either.
        let (stock_line_id, location_id) = if is_record_active_on_site && is_stock_line_valid {
            (stock_line_id, location_id)
        } else {
            (None, None)
        };

        let result = InvoiceLineRow {
            id,
            invoice_id,
            item_id,
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
            tax,
            r#type: line_type,
            number_of_packs,
            note,
            inventory_adjustment_reason_id,
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::InvoiceLine(result),
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
                PullDeleteRecordTable::InvoiceLine,
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

        let InvoiceLineRow {
            id,
            invoice_id,
            item_id,
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
            tax,
            r#type,
            number_of_packs,
            note,
            inventory_adjustment_reason_id,
        } = InvoiceLineRowRepository::new(connection).find_one_by_id(&changelog.record_id)?;

        let legacy_row = LegacyTransLineRow {
            id: id.clone(),
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
            r#type: to_legacy_invoice_line_type(&r#type),
            number_of_packs,
            note,
            item_code: Some(item_code),
            tax,
            total_before_tax: Some(total_before_tax),
            total_after_tax: Some(total_after_tax),
            inventory_adjustment_reason_id,
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

fn to_invoice_line_type(_type: &LegacyTransLineType) -> Option<InvoiceLineRowType> {
    let invoice_line_type = match _type {
        LegacyTransLineType::StockIn => InvoiceLineRowType::StockIn,
        LegacyTransLineType::StockOut => InvoiceLineRowType::StockOut,
        LegacyTransLineType::Placeholder => InvoiceLineRowType::UnallocatedStock,
        LegacyTransLineType::Service => InvoiceLineRowType::Service,
        _ => return None,
    };
    Some(invoice_line_type)
}

fn to_legacy_invoice_line_type(_type: &InvoiceLineRowType) -> LegacyTransLineType {
    match _type {
        InvoiceLineRowType::StockIn => LegacyTransLineType::StockIn,
        InvoiceLineRowType::StockOut => LegacyTransLineType::StockOut,
        InvoiceLineRowType::UnallocatedStock => LegacyTransLineType::Placeholder,
        InvoiceLineRowType::Service => LegacyTransLineType::Service,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{
        mock::{mock_outbound_shipment_a, mock_store_b, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        KeyValueStoreRow, KeyValueType,
    };
    use util::inline_init;

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
                .stock_lines(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![mock_outbound_shipment_a()];
                r.key_value_store_rows = vec![inline_init(|r: &mut KeyValueStoreRow| {
                    r.id = KeyValueType::SettingsSyncSiteId;
                    r.value_int = Some(mock_store_b().site_id);
                })]
            }),
        )
        .await;

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
