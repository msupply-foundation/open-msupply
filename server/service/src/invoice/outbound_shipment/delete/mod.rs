use domain::invoice_line::InvoiceLine;
use repository::repository::{
    InvoiceRepository, RepositoryError, StorageConnectionManager, TransactionError,
};

pub mod validate;

use validate::validate;

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
            TransactionError::Transaction { msg } => {
                DeleteOutboundShipmentError::DatabaseError(RepositoryError::DBError {
                    msg,
                    extra: "".to_string(),
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}
