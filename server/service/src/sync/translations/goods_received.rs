use crate::sync::translations::{
    invoice::InvoiceTranslation, purchase_order::PurchaseOrderTranslation, PullTranslateResult,
    PushTranslateResult, SyncTranslation,
};
use chrono::NaiveDate;
use repository::{
    goods_received_row::{
        GoodsReceivedDelete, GoodsReceivedRow, GoodsReceivedRowRepository, GoodsReceivedStatus,
    },
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::{
    date_option_to_isostring, date_to_isostring, empty_str_as_option, zero_date_as_option,
};

#[derive(Deserialize, Serialize, Debug, PartialEq, Clone)]
pub enum LegacyGoodsReceivedStatus {
    #[serde(alias = "fn")]
    Finalised,
    #[serde(alias = "nw")]
    New,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct LegacyGoodsReceived {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "store_ID")]
    pub store_id: String,
    #[serde(default)]
    #[serde(rename = "purchase_order_ID")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub purchase_order_id: Option<String>,
    #[serde(default)]
    #[serde(rename = "linked_transaction_ID")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub inbound_shipment_id: Option<String>,
    #[serde(rename = "serial_number")]
    pub goods_received_number: i64,
    pub status: LegacyGoodsReceivedStatus,
    #[serde(rename = "entry_date")]
    #[serde(serialize_with = "date_to_isostring")]
    pub created_datetime: NaiveDate,
    #[serde(deserialize_with = "zero_date_as_option")]
    #[serde(serialize_with = "date_option_to_isostring")]
    #[serde(rename = "received_date")]
    pub received_date: Option<NaiveDate>,
    #[serde(default)]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub comment: Option<String>,
    #[serde(default)]
    #[serde(rename = "supplier_reference")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub supplier_reference: Option<String>,
    #[serde(default)]
    #[serde(rename = "donor_id")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub donor_id: Option<String>,
    #[serde(default)]
    #[serde(rename = "user_id_created")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub created_by: Option<String>,
}

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(GoodsReceivedTranslation)
}

pub(super) struct GoodsReceivedTranslation;

impl SyncTranslation for GoodsReceivedTranslation {
    fn table_name(&self) -> &str {
        "Goods_received"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![
            PurchaseOrderTranslation.table_name(),
            InvoiceTranslation.table_name(),
        ]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::GoodsReceived)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let legacy: LegacyGoodsReceived = serde_json::from_str(&sync_record.data)?;
        let result = GoodsReceivedRow {
            id: legacy.id,
            store_id: legacy.store_id,
            purchase_order_id: legacy.purchase_order_id,
            inbound_shipment_id: legacy.inbound_shipment_id,
            goods_received_number: legacy.goods_received_number,
            status: match legacy.status {
                LegacyGoodsReceivedStatus::Finalised => GoodsReceivedStatus::Finalised,
                LegacyGoodsReceivedStatus::New => GoodsReceivedStatus::New,
            },
            received_date: legacy.received_date,
            comment: legacy.comment,
            supplier_reference: legacy.supplier_reference,
            donor_id: legacy.donor_id,
            created_datetime: legacy.created_datetime.and_hms_opt(0, 0, 0).unwrap(),
            finalised_datetime: None,
            created_by: legacy.created_by,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let row = GoodsReceivedRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or_else(|| anyhow::anyhow!("GoodsReceived not found"))?;
        let legacy = LegacyGoodsReceived {
            id: row.id,
            store_id: row.store_id,
            purchase_order_id: row.purchase_order_id,
            inbound_shipment_id: row.inbound_shipment_id,
            goods_received_number: row.goods_received_number,
            status: match row.status {
                GoodsReceivedStatus::New => LegacyGoodsReceivedStatus::New,
                GoodsReceivedStatus::Finalised => LegacyGoodsReceivedStatus::Finalised,
            },
            created_datetime: row.created_datetime.date(),
            received_date: row.received_date,
            comment: row.comment,
            supplier_reference: row.supplier_reference,
            donor_id: row.donor_id,
            created_by: row.created_by,
        };
        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy)?,
        ))
    }

    fn try_translate_from_delete_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        Ok(PullTranslateResult::delete(GoodsReceivedDelete(
            sync_record.record_id.clone(),
        )))
    }
}

#[cfg(test)]
mod tests {
    use crate::sync::translations::{goods_received::GoodsReceivedTranslation, SyncTranslation};
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn test_goods_received_translation() {
        use crate::sync::test::test_data::goods_received as test_data;
        let translator = GoodsReceivedTranslation {};

        let (_, connection, _, _) =
            setup_all("test_goods_received_translation", MockDataInserts::none()).await;

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
}
