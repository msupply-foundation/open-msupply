use chrono::NaiveDate;
use repository::{
    schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType, RemoteSyncBufferRow},
    EqualFilter, NameFilter, NameQueryRepository, StorageConnection,
};

use serde::Deserialize;

use crate::sync::SyncTranslationError;

use super::{
    date_and_time_to_datatime, empty_str_as_option,
    pull::{IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation},
    zero_date_as_option, TRANSLATION_RECORD_TRANSACT,
};

#[derive(Deserialize, Debug)]
enum LegacyTransactType {
    /// Supplier invoice
    #[serde(rename = "si")]
    Si,
    /// Customer invoice
    #[serde(rename = "ci")]
    Ci,
    // customer credit
    #[serde(rename = "cc")]
    Cc,
    // supplier credit
    #[serde(rename = "sc")]
    Sc,
    #[serde(other)]
    Other,
}

#[derive(Deserialize, Debug)]
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

pub struct InvoiceTranslation {}
impl RemotePullTranslation for InvoiceTranslation {
    fn try_translate_pull(
        &self,
        connection: &StorageConnection,
        sync_record: &RemoteSyncBufferRow,
    ) -> Result<Option<IntegrationRecord>, SyncTranslationError> {
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

        let name = NameQueryRepository::new(connection)
            .query_one(NameFilter::new().id(EqualFilter::equal_to(&data.name_ID)))
            .map_err(|err| SyncTranslationError {
                table_name,
                source: err.into(),
                record: sync_record.data.clone(),
            })?;
        let name_store_id =
            name.and_then(|name| name.store_id().map(|store_id| store_id.to_string()));

        let invoice_type = invoice_type(&data._type).ok_or(SyncTranslationError {
            table_name,
            source: anyhow::Error::msg(format!("Unsupported invoice type: {:?}", data._type)),
            record: sync_record.data.clone(),
        })?;
        let invoice_status = invoice_status(&invoice_type, &data).ok_or(SyncTranslationError {
            table_name,
            source: anyhow::Error::msg(format!("Unsupported invoice type: {:?}", data._type)),
            record: sync_record.data.clone(),
        })?;

        let confirm_time = data.confirm_time;
        Ok(Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Invoice(InvoiceRow {
                id: data.ID,
                store_id: data.store_ID,
                name_id: data.name_ID,
                name_store_id,
                invoice_number: data.invoice_num,
                r#type: invoice_type,
                status: invoice_status,
                on_hold: data.hold,
                comment: data.comment,
                their_reference: data.their_ref,
                created_datetime: date_and_time_to_datatime(data.entry_date, data.entry_time),
                allocated_datetime: None,
                picked_datetime: None,
                shipped_datetime: data
                    .ship_date
                    .map(|ship_date| date_and_time_to_datatime(ship_date, 0)),
                delivered_datetime: data
                    .arrival_date_actual
                    .map(|arrival| date_and_time_to_datatime(arrival, 0)),
                verified_datetime: data
                    .confirm_date
                    .map(|confirm_date| date_and_time_to_datatime(confirm_date, confirm_time)),
                colour: Some(format!("#{:06X}", data.Colour)),
                requisition_id: data.requisition_ID,
                linked_invoice_id: data.linked_transaction_id,
            }),
        )))
    }
}

fn invoice_type(_type: &LegacyTransactType) -> Option<InvoiceRowType> {
    match _type {
        LegacyTransactType::Si => Some(InvoiceRowType::InboundShipment),
        LegacyTransactType::Ci => Some(InvoiceRowType::OutboundShipment),
        _ => return None,
    }
}

fn invoice_status(
    invoice_type: &InvoiceRowType,
    data: &LegacyTransactRow,
) -> Option<InvoiceRowStatus> {
    let status = match invoice_type {
        InvoiceRowType::OutboundShipment => invoice_status_for_outbound(
            &data.status,
            data.arrival_date_actual.is_some(),
            data.ship_date.is_some(),
        ),
        InvoiceRowType::InboundShipment => shipment_status_for_inbound(
            &data.status,
            data.their_ref.is_none(),
            data.ship_date.is_some(),
        ),
        InvoiceRowType::InventoryAdjustment => return None,
    };
    Some(status)
}

fn shipment_status_for_inbound(
    status: &LegacyTransactStatus,
    manual_created: bool,
    shipped: bool,
) -> InvoiceRowStatus {
    match status {
        LegacyTransactStatus::Nw => {
            if manual_created {
                InvoiceRowStatus::New
            } else if !shipped {
                InvoiceRowStatus::Picked
            } else {
                InvoiceRowStatus::Shipped
            }
        }
        LegacyTransactStatus::Sg => InvoiceRowStatus::New,
        LegacyTransactStatus::Cn => InvoiceRowStatus::Delivered,
        LegacyTransactStatus::Fn => InvoiceRowStatus::Verified,
    }
}

fn invoice_status_for_outbound(
    status: &LegacyTransactStatus,
    delivered: bool,
    shipped: bool,
) -> InvoiceRowStatus {
    match status {
        LegacyTransactStatus::Nw => InvoiceRowStatus::New,
        // TODO could also mean Allocated
        LegacyTransactStatus::Sg => InvoiceRowStatus::New,
        LegacyTransactStatus::Cn => InvoiceRowStatus::Picked,
        LegacyTransactStatus::Fn => {
            if shipped {
                InvoiceRowStatus::Shipped
            } else if delivered {
                InvoiceRowStatus::Delivered
            } else {
                InvoiceRowStatus::Verified
            }
        }
    }
}
