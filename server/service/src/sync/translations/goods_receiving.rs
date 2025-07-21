use chrono::NaiveDate;
use repository::{
    goods_receiving_row::{GoodsReceivingRow, GoodsReceivingRowRepository, GoodsReceivingStatus},
    ChangelogRow, ChangelogTableName, StorageConnection, SyncBufferRow,
};
use serde::{Deserialize, Serialize};
use util::sync_serde::empty_str_as_option;

use crate::sync::translations::{PullTranslateResult, PushTranslateResult, SyncTranslation};

#[derive(Deserialize, Serialize, Debug, PartialEq, Clone)]
pub enum LegacyGoodsReceivingStatus {
    #[serde(alias = "fn")]
    Finalised,
    #[serde(alias = "nw")]
    New,
}

#[allow(non_snake_case)]
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct LegacyGoodsReceiving {
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
    pub goods_receiving_number: i64,
    pub status: LegacyGoodsReceivingStatus,
    #[serde(rename = "entry_date")]
    pub created_datetime: NaiveDate,
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
    pub donor_link_id: Option<String>,
    #[serde(default)]
    #[serde(rename = "user_id_created")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub created_by: Option<String>,
    #[serde(default)]
    #[serde(rename = "user_id_modified")]
    #[serde(deserialize_with = "empty_str_as_option")]
    pub modified_by: Option<String>,
}

#[deny(dead_code)]
pub(crate) fn boxed() -> Box<dyn SyncTranslation> {
    Box::new(GoodsReceivingTranslation)
}

pub(super) struct GoodsReceivingTranslation;

impl SyncTranslation for GoodsReceivingTranslation {
    fn table_name(&self) -> &str {
        "goods_receiving"
    }

    fn pull_dependencies(&self) -> Vec<&str> {
        vec![]
    }

    fn change_log_type(&self) -> Option<ChangelogTableName> {
        Some(ChangelogTableName::GoodsReceiving)
    }

    fn try_translate_from_upsert_sync_record(
        &self,
        _: &StorageConnection,
        sync_record: &SyncBufferRow,
    ) -> Result<PullTranslateResult, anyhow::Error> {
        let legacy: LegacyGoodsReceiving = serde_json::from_str(&sync_record.data)?;
        let result = GoodsReceivingRow {
            id: legacy.id,
            store_id: legacy.store_id,
            purchase_order_id: legacy.purchase_order_id,
            inbound_shipment_id: legacy.inbound_shipment_id,
            goods_receiving_number: legacy.goods_receiving_number,
            status: match legacy.status {
                LegacyGoodsReceivingStatus::Finalised => GoodsReceivingStatus::Finalised,
                LegacyGoodsReceivingStatus::New => GoodsReceivingStatus::New,
            },
            received_date: legacy.received_date,
            comment: legacy.comment,
            supplier_reference: legacy.supplier_reference,
            donor_link_id: legacy.donor_link_id,
            created_datetime: legacy.created_datetime.and_hms_opt(0, 0, 0).unwrap(),
            modified_datetime: legacy.created_datetime.and_hms_opt(0, 0, 0).unwrap(),
            finalised_datetime: None,
            created_by: legacy.created_by,
            modified_by: legacy.modified_by,
        };
        Ok(PullTranslateResult::upsert(result))
    }

    fn try_translate_to_upsert_sync_record(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<PushTranslateResult, anyhow::Error> {
        let row = GoodsReceivingRowRepository::new(connection)
            .find_one_by_id(&changelog.record_id)?
            .ok_or_else(|| anyhow::anyhow!("GoodsReceiving not found"))?;
        let legacy = LegacyGoodsReceiving {
            id: row.id,
            store_id: row.store_id,
            purchase_order_id: row.purchase_order_id,
            inbound_shipment_id: row.inbound_shipment_id,
            goods_receiving_number: row.goods_receiving_number,
            status: match row.status {
                GoodsReceivingStatus::New => LegacyGoodsReceivingStatus::New,
                GoodsReceivingStatus::Finalised => LegacyGoodsReceivingStatus::Finalised,
            },
            created_datetime: row.created_datetime.date(),
            received_date: row.received_date,
            comment: row.comment,
            supplier_reference: row.supplier_reference,
            donor_link_id: row.donor_link_id,
            created_by: row.created_by,
            modified_by: row.modified_by,
        };
        Ok(PushTranslateResult::upsert(
            changelog,
            self.table_name(),
            serde_json::to_value(legacy)?,
        ))
    }
}
