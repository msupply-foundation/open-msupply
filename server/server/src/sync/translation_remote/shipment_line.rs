use chrono::NaiveDate;
use repository::{
    schema::{InvoiceLineRow, InvoiceLineRowType, RemoteSyncBufferRow},
    ItemRepository, StorageConnection,
};

use serde::Deserialize;

use crate::sync::{translation_remote::IntegrationUpsertRecord, SyncTranslationError};

use super::{
    empty_str_as_option, zero_date_as_option, IntegrationRecord, RemotePullTranslation,
    TRANSLATION_RECORD_TRANS_LINE,
};

#[derive(Deserialize)]
enum LegacyTransLineType {
    #[serde(rename = "stock_in")]
    StockIn,
    // TODO check stock_out exist in mSupply:
    #[serde(rename = "stock_out")]
    StockOut,
    #[serde(rename = "placeholder")]
    Placeholder,
}

#[derive(Deserialize)]
struct LegacyTransLineRow {
    ID: String,
    transaction_ID: String,
    item_ID: String,
    item_name: String,
    // stock line id
    #[serde(deserialize_with = "empty_str_as_option")]
    item_line_ID: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    location_ID: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    batch: Option<String>,
    #[serde(deserialize_with = "zero_date_as_option")]
    expiry_date: Option<NaiveDate>,
    pack_size: i32,
    cost_price: f64,
    sell_price: f64,
    #[serde(rename = "type")]
    _type: LegacyTransLineType,
    // number of packs
    quantity: i32,
    #[serde(deserialize_with = "empty_str_as_option")]
    note: Option<String>,
}

pub struct ShipmentLineTranslation {}
impl RemotePullTranslation for ShipmentLineTranslation {
    fn try_translate_pull(
        &self,
        connection: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<super::IntegrationRecord>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_TRANS_LINE;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data =
            serde_json::from_str::<LegacyTransLineRow>(&sync_record.data).map_err(|source| {
                SyncTranslationError {
                    table_name,
                    source: source.into(),
                    record: sync_record.data.clone(),
                }
            })?;

        let item = match ItemRepository::new(connection)
            .find_one_by_id(&data.item_ID)
            .map_err(|source| SyncTranslationError {
                table_name,
                source: source.into(),
                record: sync_record.data.clone(),
            })? {
            Some(item) => item,
            None => {
                return Err(SyncTranslationError {
                    table_name,
                    source: anyhow::Error::msg(format!("Failed to find item: {}", data.item_ID)),
                    record: sync_record.data.clone(),
                })
            }
        };

        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::ShipmentLine(InvoiceLineRow {
                id: data.ID,
                invoice_id: data.transaction_ID,
                item_id: data.item_ID,
                item_name: data.item_name,
                item_code: item.code,
                stock_line_id: data.item_line_ID,
                location_id: data.location_ID,
                batch: data.batch,
                expiry_date: data.expiry_date,
                pack_size: data.pack_size,
                cost_price_per_pack: data.cost_price,
                sell_price_per_pack: data.sell_price,
                total_before_tax: data.cost_price * data.quantity as f64,
                total_after_tax: data.cost_price * data.quantity as f64,
                tax: None,
                r#type: to_shipment_line_type(data._type),
                number_of_packs: data.quantity,
                note: data.note,
            }),
        )))
    }
}

fn to_shipment_line_type(_type: LegacyTransLineType) -> InvoiceLineRowType {
    match _type {
        LegacyTransLineType::StockIn => InvoiceLineRowType::StockIn,
        LegacyTransLineType::StockOut => InvoiceLineRowType::StockOut,
        LegacyTransLineType::Placeholder => InvoiceLineRowType::UnallocatedStock,
    }
}
