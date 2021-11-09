use crate::service::WithDBError;
use domain::{inbound_shipment::InsertInboundShipment, name::Name};
use repository::repository::{
    InvoiceRepository, RepositoryError, StorageConnectionManager, TransactionError,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

use super::OtherPartyError;

pub fn insert_inbound_shipment(
    connection_manager: &StorageConnectionManager,
    input: InsertInboundShipment,
) -> Result<String, InsertInboundShipmentError> {
    let connection = connection_manager.connection()?;
    let new_invoice = connection
        .transaction_sync(|connection| {
            validate(&input, &connection)?;
            let new_invoice = generate(input, &connection)?;
            InvoiceRepository::new(&connection).upsert_one(&new_invoice)?;
            Ok(new_invoice)
        })
        .map_err(
            |error: TransactionError<InsertInboundShipmentError>| match error {
                TransactionError::Transaction { msg } => {
                    RepositoryError::as_db_error(&msg, "").into()
                }
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(new_invoice.id)
}

pub enum InsertInboundShipmentError {
    InvoiceAlreadyExists,
    DatabaseError(RepositoryError),
    OtherPartyDoesNotExist,
    OtherPartyNotASupplier(Name),
}

impl From<RepositoryError> for InsertInboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        InsertInboundShipmentError::DatabaseError(error)
    }
}

impl From<OtherPartyError> for InsertInboundShipmentError {
    fn from(error: OtherPartyError) -> Self {
        use InsertInboundShipmentError::*;
        match error {
            OtherPartyError::NotASupplier(name) => OtherPartyNotASupplier(name),
            OtherPartyError::DoesNotExist => OtherPartyDoesNotExist,
            OtherPartyError::DatabaseError(error) => DatabaseError(error),
        }
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertInboundShipmentError
where
    ERR: Into<InsertInboundShipmentError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
