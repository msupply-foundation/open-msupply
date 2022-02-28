use chrono::NaiveDate;
use repository::{
    schema::{
        ChangelogRow, ChangelogTableName, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
        RemoteSyncBufferRow,
    },
    InvoiceRepository, NameQueryRepository, StorageConnection,
};

use serde::{Deserialize, Serialize};

use crate::sync::SyncTranslationError;

use super::{
    date_and_time_to_datatime, date_from_date_time, empty_str_as_option,
    pull::{IntegrationRecord, IntegrationUpsertRecord, RemotePullTranslation},
    push::{to_push_translation_error, PushUpsertRecord, RemotePushUpsertTranslation},
    time_sec_from_date_time, zero_date_as_option, TRANSLATION_RECORD_TRANSACT,
};

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyTransactType {
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

#[derive(Deserialize, Serialize, Debug)]
pub enum LegacyTransactStatus {
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
#[derive(Deserialize, Serialize)]
pub struct LegacyTransactRow {
    pub ID: String,

    pub name_ID: String,
    pub store_ID: String,
    pub invoice_num: i64,
    #[serde(rename = "type")]
    pub _type: LegacyTransactType,
    pub status: LegacyTransactStatus,

    pub hold: bool,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub comment: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub their_ref: Option<String>,

    pub Colour: i32,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub requisition_ID: Option<String>,
    #[serde(deserialize_with = "empty_str_as_option")]
    pub linked_transaction_id: Option<String>,

    /// creation time
    pub entry_date: NaiveDate, // e.g. "2021-07-30",
    /// time in seconds
    pub entry_time: i64, // e.g. 47046,
    /// shipped_datetime
    #[serde(deserialize_with = "zero_date_as_option")]
    pub ship_date: Option<NaiveDate>, // "0000-00-00",
    /// delivered_datetime
    #[serde(deserialize_with = "zero_date_as_option")]
    pub arrival_date_actual: Option<NaiveDate>,
    /// verified_datetime
    #[serde(deserialize_with = "zero_date_as_option")]
    pub confirm_date: Option<NaiveDate>,
    pub confirm_time: i64,
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
        InvoiceRowType::InboundShipment => invoice_status_for_inbound(
            &data.status,
            data.their_ref.is_none(),
            data.ship_date.is_some(),
        ),
        InvoiceRowType::InventoryAdjustment => return None,
    };
    Some(status)
}

fn invoice_status_for_inbound(
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

impl RemotePushUpsertTranslation for InvoiceTranslation {
    fn try_translate_push(
        &self,
        connection: &StorageConnection,
        changelog: &ChangelogRow,
    ) -> Result<Option<Vec<PushUpsertRecord>>, SyncTranslationError> {
        if changelog.table_name != ChangelogTableName::Invoice {
            return Ok(None);
        }
        let table_name = TRANSLATION_RECORD_TRANSACT;

        let InvoiceRow {
            id,
            name_id,
            // TODO
            name_store_id: _,
            store_id,
            invoice_number,
            r#type,
            status,
            on_hold,
            comment,
            their_reference,
            created_datetime,
            // TODO:
            allocated_datetime: _,
            // TODO:
            picked_datetime: _,
            shipped_datetime,
            delivered_datetime,
            verified_datetime,
            colour,
            requisition_id,
            linked_invoice_id,
        } = InvoiceRepository::new(connection)
            .find_one_by_id(&changelog.row_id)
            .map_err(|err| to_push_translation_error(table_name, err.into(), changelog))?;

        let _type = legacy_invoice_type(&r#type).ok_or(to_push_translation_error(
            table_name,
            anyhow::Error::msg(format!("Invalid invoice type: {:?}", r#type)),
            changelog,
        ))?;
        let status = legacy_invoice_status(&r#type, &status).ok_or(to_push_translation_error(
            table_name,
            anyhow::Error::msg(format!("Invalid invoice status: {:?}", r#status)),
            changelog,
        ))?;
        let legacy_row = LegacyTransactRow {
            ID: id.clone(),
            name_ID: name_id,
            store_ID: store_id.clone(),
            invoice_num: invoice_number,
            _type,
            status,
            hold: on_hold,
            comment,
            their_ref: their_reference,
            Colour: colour.map(|colour| parse_html_colour(&colour)).unwrap_or(0),
            requisition_ID: requisition_id,
            linked_transaction_id: linked_invoice_id,
            entry_date: date_from_date_time(&created_datetime),
            entry_time: time_sec_from_date_time(&created_datetime),
            // TODO losing the time here:
            ship_date: shipped_datetime
                .map(|shipped_datetime| date_from_date_time(&shipped_datetime)),
            // TODO losing the time here:
            arrival_date_actual: delivered_datetime
                .map(|delivered_datetime| date_from_date_time(&delivered_datetime)),
            confirm_date: verified_datetime
                .map(|verified_datetime| date_from_date_time(&verified_datetime)),
            confirm_time: verified_datetime
                .map(|verified_datetime| time_sec_from_date_time(&verified_datetime))
                .unwrap_or(0),
        };

        Ok(Some(vec![PushUpsertRecord {
            sync_id: changelog.id,
            store_id: Some(store_id),
            table_name,
            record_id: id,
            data: serde_json::to_value(&legacy_row)
                .map_err(|err| to_push_translation_error(table_name, err.into(), changelog))?,
        }]))
    }
}

fn parse_html_colour(colour: &str) -> i32 {
    i32::from_str_radix(&colour[1..], 16).unwrap_or(0)
}

fn legacy_invoice_type(_type: &InvoiceRowType) -> Option<LegacyTransactType> {
    let t = match _type {
        InvoiceRowType::OutboundShipment => LegacyTransactType::Ci,
        InvoiceRowType::InboundShipment => LegacyTransactType::Si,
        // TODO:
        InvoiceRowType::InventoryAdjustment => return None,
    };
    return Some(t);
}

fn legacy_invoice_status(
    t: &InvoiceRowType,
    status: &InvoiceRowStatus,
) -> Option<LegacyTransactStatus> {
    let status = match t {
        InvoiceRowType::OutboundShipment => match status {
            InvoiceRowStatus::New => LegacyTransactStatus::Sg,
            InvoiceRowStatus::Allocated => LegacyTransactStatus::Sg,
            InvoiceRowStatus::Picked => LegacyTransactStatus::Cn,
            InvoiceRowStatus::Shipped => LegacyTransactStatus::Fn,
            InvoiceRowStatus::Delivered => LegacyTransactStatus::Fn,
            InvoiceRowStatus::Verified => LegacyTransactStatus::Fn,
        },
        InvoiceRowType::InboundShipment => match status {
            InvoiceRowStatus::New => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Allocated => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Picked => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Shipped => LegacyTransactStatus::Nw,
            InvoiceRowStatus::Delivered => LegacyTransactStatus::Cn,
            InvoiceRowStatus::Verified => LegacyTransactStatus::Fn,
        },
        InvoiceRowType::InventoryAdjustment => return None,
    };
    Some(status)
}
