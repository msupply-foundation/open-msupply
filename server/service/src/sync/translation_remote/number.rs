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
    #[serde(rename = "store_ID")]
    pub store_id: String,
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
                r#type: type_and_store.0,
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

        let name = match to_number_name(&r#type, &store_id) {
            Some(name) => name,
            None => return Ok(None),
        };
        let legacy_row = LegacyNumberRow {
            ID: id.clone(),
            name,
            value,
            store_id: store_id.clone(),
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
        _ => return None,
    };
    let store = split.next()?.to_string();
    Some((number_type, store))
}

fn to_number_name(number_type: &NumberRowType, store_id: &str) -> Option<String> {
    let number_str = match number_type {
        NumberRowType::InboundShipment => "supplier_invoice_number",
        NumberRowType::OutboundShipment => "customer_invoice_number",
        NumberRowType::InventoryAdjustment => "inventory_adjustment_serial_number",
        NumberRowType::Stocktake => "stock_take_number",
        // new for omSupply
        NumberRowType::RequestRequisition => "request_requisition",
        NumberRowType::ResponseRequisition => "response_requisition",
    };
    Some(format!("{}_for_store_{}", number_str, store_id))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::translation_remote::{
        pull::RemotePullTranslation, test_data::number::get_test_number_records,
    };
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_number_translation() {
        let (_, connection, _, _) =
            setup_all("test_number_translation", MockDataInserts::all()).await;

        let translator = NumberTranslation {};
        for record in get_test_number_records() {
            let translation_result = translator
                .try_translate_pull(&connection, &record.remote_sync_buffer_row)
                .expect(&format!("{:#?}", &record.remote_sync_buffer_row));

            assert_eq!(translation_result, record.translated_record,);
        }
    }
}
