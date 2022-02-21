use repository::{
    schema::{NumberRow, NumberRowType, RemoteSyncBufferRow},
    StorageConnection,
};

use serde::Deserialize;

use crate::sync::SyncTranslationError;

use super::{
    IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation, TRANSLATION_RECORD_NUMBER,
};

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyNumberRow {
    ID: String,
    name: String,
    value: i64,
}

pub struct NumberTranslation {}
impl RemotePullTranslation for NumberTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<IntegrationRecord>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_NUMBER;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data =
            serde_json::from_str::<LegacyNumberRow>(&sync_record.data).map_err(|source| {
                SyncTranslationError {
                    table_name,
                    source: source.into(),
                    record: sync_record.data.clone(),
                }
            })?;

        let type_and_store = match parse_number_name(data.name) {
            Some(type_and_store) => type_and_store,
            None => return Ok(None),
        };
        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Number(NumberRow {
                id: data.ID.to_string(),
                value: data.value,
                store_id: type_and_store.1,
                r#type: type_and_store.0,
            }),
        )))
    }
}

fn parse_number_name(value: String) -> Option<(NumberRowType, String)> {
    let mut split = value.split("_for_store_");
    let number_type = match split.next()? {
        "stock_take_number" => NumberRowType::Stocktake,
        "inventory_adjustment_serial_number" => NumberRowType::InventoryAdjustment,
        "supplier_invoice_number" => NumberRowType::InboundShipment,
        "customer_invoice_number" => NumberRowType::OutboundShipment,
        // NumberRowType::RequestRequisition ?,
        // "purchase_order_number" => ,
        _ => return None,
    };
    let store = split.next()?.to_string();
    Some((number_type, store))
}
