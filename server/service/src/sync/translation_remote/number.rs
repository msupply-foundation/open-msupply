use std::convert::TryFrom;

use repository::{
    ChangelogRow, ChangelogTableName, NumberRow, NumberRowRepository, NumberRowType,
    RemoteSyncBufferRow, StorageConnection,
};

use serde::{Deserialize, Serialize};

use super::{
    pull::{IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation},
    push::{PushUpsertRecord, RemotePushUpsertTranslation},
    TRANSLATION_RECORD_NUMBER,
};

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, PartialEq)]
pub struct LegacyNumberRow {
    pub ID: String,
    pub name: String,
    pub value: i64,
}

pub struct NumberTranslation {}
impl RemotePullTranslation for NumberTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<IntegrationRecord>, anyhow::Error> {
        let table_name = TRANSLATION_RECORD_NUMBER;

        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyNumberRow>(&sync_record.data)?;

        let type_and_store = match parse_number_name(data.name) {
            Some(type_and_store) => type_and_store,
            None => return Ok(None),
        };
        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Number(NumberRow {
                id: data.ID.to_string(),
                value: data.value,
                store_id: type_and_store.1,
                r#type: type_and_store.0.to_string(),
            }),
        )))
    }
}

impl RemotePushUpsertTranslation for NumberTranslation {
    fn try_translate_push(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, anyhow::Error> {
        if changelog.table_name != ChangelogTableName::Number {
            return Ok(None);
        }
        let table_name = TRANSLATION_RECORD_NUMBER;

        let NumberRow {
            id,
            value,
            store_id,
            r#type,
        } = NumberRowRepository::new(connection)
            .find_one_by_id(&changelog.row_id)?
            .ok_or(anyhow::Error::msg("Number row not found"))?;

        let number_type = match NumberRowType::try_from(r#type) {
            Ok(number_type) => number_type,
            Err(e) => return Err(anyhow::Error::msg(format!("Invalid number type {:?}", e))),
        };

        let name = match to_number_name(&number_type, &store_id) {
            Some(name) => name,
            None => return Ok(None),
        };
        let legacy_row = LegacyNumberRow {
            ID: id.clone(),
            name,
            value,
        };

        Ok(Some(vec![PushUpsertRecord {
            sync_id: changelog.id,
            store_id: Some(store_id),
            table_name,
            record_id: id,
            data: serde_json::to_value(&legacy_row)?,
        }]))
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
        // new for omSupply
        "request_requisition" => NumberRowType::RequestRequisition,
        "response_requisition" => NumberRowType::ResponseRequisition,
        s => match NumberRowType::try_from(s.to_string()) {
            Ok(number_type) => number_type,
            Err(_) => return None,
        },
    };
    let store = split.next()?.to_string();
    Some((number_type, store))
}

fn to_number_name(number_type: &NumberRowType, store_id: &str) -> Option<String> {
    let number_str = match number_type {
        NumberRowType::InboundShipment => "supplier_invoice_number".to_string(),
        NumberRowType::OutboundShipment => "customer_invoice_number".to_string(),
        NumberRowType::InventoryAdjustment => "inventory_adjustment_serial_number".to_string(),
        NumberRowType::Stocktake => "stock_take_number".to_string(),
        // new for omSupply
        NumberRowType::RequestRequisition => "request_requisition".to_string(),
        NumberRowType::ResponseRequisition => "response_requisition".to_string(),
        NumberRowType::Program(s) => {
            format!("PROGRAM_{}", s)
        }
    };
    Some(format!("{}_for_store_{}", number_str, store_id))
}
