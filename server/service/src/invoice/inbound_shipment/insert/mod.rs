use crate::WithDBError;
use domain::{inbound_shipment::InsertInboundShipment, name::Name};
use repository::{InvoiceRepository, RepositoryError, StorageConnection, TransactionError};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

pub fn insert_inbound_shipment(
    connection: &StorageConnection,
    input: InsertInboundShipment,
) -> Result<String, InsertInboundShipmentError> {
    let new_invoice = connection
        .transaction_sync(|connection| {
            let other_party = validate(&input, &connection)?;
            let new_invoice = generate(input, other_party, connection)?;
            InvoiceRepository::new(&connection).upsert_one(&new_invoice)?;
            Ok(new_invoice)
        })
        .map_err(
            |error: TransactionError<InsertInboundShipmentError>| match error {
                TransactionError::Transaction { msg, level } => {
                    RepositoryError::TransactionError { msg, level }.into()
                }
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(new_invoice.id)
}

#[derive(Debug)]
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
