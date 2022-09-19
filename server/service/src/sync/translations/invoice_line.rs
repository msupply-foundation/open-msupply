use crate::sync::sync_serde::{date_option_to_isostring, empty_str_as_option, zero_date_as_option};
use chrono::NaiveDate;
use repository::{
    ChangelogRow, ChangelogTableName, InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineRowType,
    ItemRowRepository, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

use super::{
    is_active_record_on_site, ActiveRecordCheck, IntegrationRecords, LegacyTableName,
    PullDeleteRecordTable, PullUpsertRecord, PushUpsertRecord, SyncTranslation,
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
    #[serde(deserialize_with = "empty_str_as_option")]
    pub stock_line_id: Option<String>,
    #[serde(rename = "location_ID")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub location_id: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
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
    pub number_of_packs: i32,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub note: Option<String>,

    #[serde(rename = "om_item_code")]
    pub item_code: Option<String>,
    #[serde(rename = "om_tax")]
    pub tax: Option<f64>,
    #[serde(rename = "om_total_before_tax")]
    pub total_before_tax: Option<f64>,
    #[serde(rename = "om_total_after_tax")]
    pub total_after_tax: Option<f64>,
}

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LegacyTableName::TRANS_LINE
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
        // When invoice lines are coming from another site, we don't get stock line and location
        // so foreign key constraint is violated, thus we want to set them to None if it's foreign site record.
        let (stock_line_id, location_id) = if is_active_record_on_site(
            &connection,
            ActiveRecordCheck::InvoiceLine {
                invoice_id: invoice_id.clone(),
            },
        )? {
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

    fn try_translate_push(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, anyhow::Error> {
        if changelog.table_name != ChangelogTableName::InvoiceLine {
            return Ok(None);
        }
        let table_name = LegacyTableName::TRANS_LINE;

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
        };

        Ok(Some(vec![PushUpsertRecord {
            sync_id: changelog.cursor,
            table_name,
            record_id: id,
            data: serde_json::to_value(&legacy_row)?,
        }]))
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
            MockDataInserts::none().units().items().names().stores(),
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
