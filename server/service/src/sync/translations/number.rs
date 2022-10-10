use std::convert::TryFrom;

use crate::sync::api::RemoteSyncRecordV5;

use super::{IntegrationRecords, LegacyTableName, PullUpsertRecord, SyncTranslation};
use repository::{
    ChangelogRow, ChangelogTableName, NumberRow, NumberRowRepository, NumberRowType,
    StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};

const LEGACY_TABLE_NAME: &'static str = LegacyTableName::NUMBER;

fn match_pull_table(sync_record: &SyncBufferRow) -> bool {
    sync_record.table_name == LEGACY_TABLE_NAME
}
fn match_push_table(changelog: &ChangelogRow) -> bool {
    changelog.table_name == ChangelogTableName::Number
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, PartialEq)]
pub struct LegacyNumberRow {
    pub ID: String,
    pub name: String,
    pub value: i64,
    #[serde(rename = "store_ID")]
    pub store_id: String,
}

pub(crate) struct NumberTranslation {}
impl SyncTranslation for NumberTranslation {
    fn try_translate_pull_upsert(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<Option<IntegrationRecords>, anyhow::Error> {
        if !match_pull_table(sync_record) {
            return Ok(None);
        }

        let data = serde_json::from_str::<LegacyNumberRow>(&sync_record.data)?;

        let type_and_store = match parse_number_name(data.name) {
            Some(type_and_store) => type_and_store,
            None => return Ok(None),
        };

        let result = NumberRow {
            id: data.ID.to_string(),
            value: data.value,
            store_id: type_and_store.1,
            r#type: type_and_store.0.to_string(),
        };

        Ok(Some(IntegrationRecords::from_upsert(
            PullUpsertRecord::Number(result),
        )))
    }

    fn try_translate_push_upsert(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<RemoteSyncRecordV5>>, anyhow::Error> {
        if !match_push_table(changelog) {
            return Ok(None);
        }

        let NumberRow {
            id,
            value,
            store_id,
            r#type,
        } = NumberRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
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
            store_id: store_id.clone(),
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

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_number_translation() {
        use crate::sync::test::test_data::number as test_data;
        let translator = NumberTranslation {};

        let (_, connection, _, _) =
            setup_all("test_number_translation", MockDataInserts::none()).await;

        for record in test_data::test_pull_upsert_records() {
            let translation_result = translator
                .try_translate_pull_upsert(&connection, &record.sync_buffer_row)
                .unwrap();

            assert_eq!(translation_result, record.translated_record);
        }
    }
}
