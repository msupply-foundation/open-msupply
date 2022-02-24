use repository::{InvoiceRepository, RepositoryError, StorageConnectionManager, TransactionError, InvoiceLine};

pub mod validate;

use validate::validate;

use crate::WithDBError;

pub fn delete_outbound_shipment(
    connection_manager: &StorageConnectionManager,
    id: String,
) -> Result<String, DeleteOutboundShipmentError> {
    let connection = connection_manager.connection()?;
    connection.transaction_sync(|connection| {
        validate(&id, &connection)?;
        InvoiceRepository::new(&connection).delete(&id)?;
        Ok(())
    })?;
    Ok(id)
}

pub enum DeleteOutboundShipmentError {
    InvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    NotThisStoreInvoice,
    CannotEditFinalised,
    InvoiceLinesExists(Vec<InvoiceLine>),
    NotAnOutboundShipment,
}

impl From<RepositoryError> for DeleteOutboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        DeleteOutboundShipmentError::DatabaseError(error)
    }
}

impl From<TransactionError<DeleteOutboundShipmentError>> for DeleteOutboundShipmentError {
    fn from(error: TransactionError<DeleteOutboundShipmentError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                DeleteOutboundShipmentError::DatabaseError(RepositoryError::TransactionError {
                    msg,
                    level,
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteOutboundShipmentError
where
    ERR: Into<DeleteOutboundShipmentError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
