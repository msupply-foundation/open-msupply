use chrono::{NaiveDateTime, Utc};

use domain::{
    inbound_shipment::InsertInboundShipment,
    invoice::{InvoiceStatus, InvoiceType},
};
use repository::{
    repository::{RepositoryError, StorageConnection, StoreRepository},
    schema::InvoiceRow,
};

use super::InsertInboundShipmentError;

pub fn generate(
    InsertInboundShipment {
        id,
        other_party_id,
        status,
        on_hold,
        comment,
        their_reference,
        color,
    }: InsertInboundShipment,
    connection: &StorageConnection,
) -> Result<InvoiceRow, InsertInboundShipmentError> {
    let current_datetime = Utc::now().naive_utc();

    let result = InvoiceRow {
        id,
        name_id: other_party_id,
        r#type: InvoiceType::InboundShipment.into(),
        comment,
        their_reference,
        invoice_number: new_invoice_number(),
        store_id: current_store_id(connection)?,
        confirm_datetime: confirm_datetime(&status, &current_datetime),
        finalised_datetime: finalised_datetime(&status, &current_datetime),
        status: status.into(),
        on_hold: on_hold.unwrap_or(false),
        entry_datetime: current_datetime,
        color,
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
        InvoiceStatus::Finalised => Some(current_time.clone()),
        _ => None,
    }
}

pub fn current_store_id(connection: &StorageConnection) -> Result<String, RepositoryError> {
    // Need to check session for store
    Ok(StoreRepository::new(connection).all()?[0].id.clone())
}
