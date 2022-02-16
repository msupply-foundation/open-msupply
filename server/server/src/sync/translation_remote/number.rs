use repository::schema::{NumberRow, NumberRowType, RemoteSyncBufferRow};

use serde::Deserialize;

use crate::sync::translation_central::SyncTranslationError;

use super::TRANSLATION_RECORD_NUMBER;

#[allow(non_snake_case)]
#[derive(Deserialize)]
pub struct LegacyNumberRow {
    ID: String,
    name: String,
    value: i64,
}

impl LegacyNumberRow {
    pub fn try_translate_pull(
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<NumberRow>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_NUMBER;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data =
            serde_json::from_str::<LegacyNumberRow>(&sync_record.data).map_err(|source| {
                SyncTranslationError {
                    table_name,
                    source,
                    record: sync_record.data.clone(),
                }
            })?;

        let type_and_store = match parse_number_name(data.name) {
            Some(type_and_store) => type_and_store,
            None => return Ok(None),
        };
        Ok(Some(NumberRow {
            id: data.ID.to_string(),
            value: data.value,
            store_id: type_and_store.1,
            r#type: type_and_store.0,
        }))
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

#[cfg(test)]
mod tests {
    use crate::sync::translation_remote::{
        number::LegacyNumberRow,
        test_data::{number::get_test_number_records, TestSyncDataRecord},
    };

    #[test]
    fn test_number_translation() {
        for record in get_test_number_records() {
            match record.translated_record {
                TestSyncDataRecord::Number(translated_record) => {
                    assert_eq!(
                        LegacyNumberRow::try_translate_pull(&record.remote_sync_buffer_row)
                            .unwrap(),
                        translated_record,
                        "{}",
                        record.identifier
                    )
                }
                _ => panic!("Testing wrong record type {:#?}", record.translated_record),
            }
        }
    }
}
