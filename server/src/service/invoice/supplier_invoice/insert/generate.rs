use chrono::{NaiveDateTime, Utc};

use crate::{
    database::{
        repository::{RepositoryError, StorageConnection, StoreRepository},
        schema::InvoiceRow,
    },
    domain::{
        invoice::{InvoiceStatus, InvoiceType},
        supplier_invoice::InsertSupplierInvoice,
    },
};

use super::InsertSupplierInvoiceError;

pub fn generate(
    InsertSupplierInvoice {
        id,
        other_party_id,
        status,
        comment,
        their_reference,
    }: InsertSupplierInvoice,
    connection: &StorageConnection,
) -> Result<InvoiceRow, InsertSupplierInvoiceError> {
    let current_datetime = Utc::now().naive_utc();

    let result = InvoiceRow {
        id,
        name_id: other_party_id,
        r#type: InvoiceType::SupplierInvoice.into(),
        comment,
        their_reference,
        invoice_number: new_invoice_number(),
        store_id: current_store_id(connection)?,
        confirm_datetime: confirm_datetime(&status, &current_datetime),
        finalised_datetime: finalised_datetime(&status, &current_datetime),
        status: status.into(),
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
