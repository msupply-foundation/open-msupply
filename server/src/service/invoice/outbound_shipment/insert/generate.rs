use chrono::{NaiveDateTime, Utc};

use crate::{
    database::{
        repository::{RepositoryError, StorageConnection, StoreRepository},
        schema::InvoiceRow,
    },
    domain::{
        invoice::{InvoiceStatus, InvoiceType},
        outbound_shipment::InsertOutboundShipment,
    },
};

use super::InsertOutboundShipmentError;

pub fn generate(
    input: InsertOutboundShipment,
    connection: &StorageConnection,
) -> Result<InvoiceRow, InsertOutboundShipmentError> {
    let current_datetime = Utc::now().naive_utc();

    let result = InvoiceRow {
        id: input.id,
        name_id: input.other_party_id,
        r#type: InvoiceType::OutboundShipment.into(),
        comment: input.comment,
        their_reference: input.their_reference,
        invoice_number: new_invoice_number(),
        store_id: current_store_id(connection)?,
        confirm_datetime: confirm_datetime(&input.status, &current_datetime),
        finalised_datetime: finalised_datetime(&input.status, &current_datetime),
        status: input.status.into(),
        on_hold: input.on_hold.unwrap_or(false),
        entry_datetime: current_datetime,
    };

    Ok(result)
}

fn new_invoice_number() -> i32 {
    // TODO Existing mSupply Mechanism for this
    1
}

fn confirm_datetime(status: &InvoiceStatus, current_time: &NaiveDateTime) -> Option<NaiveDateTime> {
    match status {
        InvoiceStatus::Draft => None,
        _ => Some(current_time.clone()),
    }
}

fn finalised_datetime(
    status: &InvoiceStatus,
    current_time: &NaiveDateTime,
) -> Option<NaiveDateTime> {
    match status {
        InvoiceStatus::Finalised => None,
        _ => Some(current_time.clone()),
    }
}

pub fn current_store_id(connection: &StorageConnection) -> Result<String, RepositoryError> {
    // Need to check session for store
    Ok(StoreRepository::new(connection).all()?[0].id.clone())
}
