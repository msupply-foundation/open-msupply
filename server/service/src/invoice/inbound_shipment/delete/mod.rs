use repository::{
    InvoiceLine, InvoiceRepository, RepositoryError, StorageConnectionManager, TransactionError,
};

mod validate;

use validate::validate;

use crate::WithDBError;

pub struct DeleteInboundShipment {
    pub id: String,
}

pub fn delete_inbound_shipment(
    connection_manager: &StorageConnectionManager,
    input: DeleteInboundShipment,
) -> Result<String, DeleteInboundShipmentError> {
    let connection = connection_manager.connection()?;
    connection
        .transaction_sync(|connection| {
            validate(&input, &connection)?;
            InvoiceRepository::new(&connection).delete(&input.id)?;
            Ok(())
        })
        .map_err(
            |error: TransactionError<DeleteInboundShipmentError>| match error {
                TransactionError::Transaction { msg, level } => {
                    RepositoryError::TransactionError { msg, level }.into()
                }
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(input.id)
}

pub enum DeleteInboundShipmentError {
    InvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    NotAnInboundShipment,
    NotThisStoreInvoice,
    CannotEditFinalised,
    InvoiceLinesExists(Vec<InvoiceLine>),
}

impl From<RepositoryError> for DeleteInboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        DeleteInboundShipmentError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteInboundShipmentError
where
    ERR: Into<DeleteInboundShipmentError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
