use chrono::{Duration, NaiveDate, NaiveDateTime, NaiveTime};
use repository::{
    schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType, RemoteSyncBufferRow},
    StorageConnection,
};

use serde::Deserialize;

use crate::sync::translation_central::SyncTranslationError;

use super::{
    empty_str_as_option, zero_date_as_option, IntegrationRecord, IntegrationUpsertRecord,
    RemotePullTranslation, TRANSLATION_RECORD_TRANSACT,
};

#[derive(Deserialize)]
enum LegacyTransactType {
    /// Supplier invoice
    #[serde(rename = "si")]
    Si,
    /// Customer invoice
    #[serde(rename = "ci")]
    Ci,
    // customer credit
    //cc,
    // supplier credit
    //sc,
}

#[derive(Deserialize)]
enum LegacyTransactStatus {
    /// new
    #[serde(rename = "nw")]
    Nw,
    /// suggested
    #[serde(rename = "sg")]
    Sg,
    /// confirmed
    #[serde(rename = "cn")]
    Cn,
    /// finalised
    #[serde(rename = "fn")]
    Fn,
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct LegacyTransactRow {
    ID: String,

    name_ID: String,
    store_ID: String,
    invoice_num: i64,
    #[serde(rename = "type")]
    _type: LegacyTransactType,
    status: LegacyTransactStatus,

    hold: bool,
    #[serde(deserialize_with = "empty_str_as_option")]
    comment: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    their_ref: Option<String>,

    Colour: i32,
    #[serde(deserialize_with = "empty_str_as_option")]
    requisition_ID: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    linked_transaction_id: Option<String>,

    /// creation time
    entry_date: NaiveDate, // e.g. "2021-07-30",
    /// time in seconds
    entry_time: i64, // e.g. 47046,
    /// shipped_datetime
    #[serde(deserialize_with = "zero_date_as_option")]
    ship_date: Option<NaiveDate>, // "0000-00-00",
    /// delivered_datetime
    #[serde(deserialize_with = "zero_date_as_option")]
    arrival_date_actual: Option<NaiveDate>,
    /// verified_datetime
    #[serde(deserialize_with = "zero_date_as_option")]
    confirm_date: Option<NaiveDate>,
    confirm_time: i64,
}

fn data_and_time_to_datatime(date: NaiveDate, seconds: i64) -> NaiveDateTime {
    NaiveDateTime::new(
        date,
        NaiveTime::from_hms(0, 0, 0) + Duration::seconds(seconds),
    )
}

pub struct ShipmentTranslation {}
impl RemotePullTranslation for ShipmentTranslation {
    fn try_translate_pull(
        &self,
        _: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<super::IntegrationRecord>, SyncTranslationError> {
        let table_name = TRANSLATION_RECORD_TRANSACT;
        if sync_record.table_name != table_name {
            return Ok(None);
        }

        let data =
            serde_json::from_str::<LegacyTransactRow>(&sync_record.data).map_err(|source| {
                SyncTranslationError {
                    table_name,
                    source: source.into(),
                    record: sync_record.data.clone(),
                }
            })?;

        let confirm_time = data.confirm_time;
        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Shipment(InvoiceRow {
                id: data.ID,
                store_id: data.store_ID,
                name_id: data.name_ID,
                // TODO is None correct?
                name_store_id: None,
                invoice_number: data.invoice_num,
                r#type: shipment_type(&data._type),
                status: shipment_status(&data.status),
                on_hold: data.hold,
                comment: data.comment,
                their_reference: data.their_ref,
                created_datetime: data_and_time_to_datatime(data.entry_date, data.entry_time),
                allocated_datetime: None,
                picked_datetime: None,
                shipped_datetime: data
                    .ship_date
                    .map(|ship_date| data_and_time_to_datatime(ship_date, 0)),
                delivered_datetime: data
                    .arrival_date_actual
                    .map(|arrival| data_and_time_to_datatime(arrival, 0)),
                verified_datetime: data
                    .confirm_date
                    .map(|confirm_date| data_and_time_to_datatime(confirm_date, confirm_time)),
                colour: Some(format!("#{:06X}", data.Colour)),
                requisition_id: data.requisition_ID,
                linked_invoice_id: data.linked_transaction_id,
            }),
        )))
    }
}

fn shipment_type(_type: &LegacyTransactType) -> InvoiceRowType {
    match _type {
        LegacyTransactType::Si => InvoiceRowType::InboundShipment,
        LegacyTransactType::Ci => InvoiceRowType::OutboundShipment,
    }
}

fn shipment_status(status: &LegacyTransactStatus) -> InvoiceRowStatus {
    match status {
        LegacyTransactStatus::Nw => InvoiceRowStatus::New,
        // suggested TODO correct mapping?
        LegacyTransactStatus::Sg => InvoiceRowStatus::Allocated,
        // confirmed TODO correct mapping?
        LegacyTransactStatus::Cn => InvoiceRowStatus::Picked,
        LegacyTransactStatus::Fn => InvoiceRowStatus::Verified,
    }
}
