use repository::{InvoiceLine, InvoiceRepository, RepositoryError, TransactionError};

pub mod validate;

use validate::validate;

use crate::{service_provider::ServiceContext, WithDBError};

type OutError = DeleteOutboundShipmentError;

pub fn delete_outbound_shipment(
    ctx: &ServiceContext,
    _store_id: &str,
    id: &str,
) -> Result<String, DeleteOutboundShipmentError> {
    let invoice_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&id, &connection)?;
            match InvoiceRepository::new(&connection).delete(&id) {
                Ok(_) => Ok(id),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(invoice_id.to_string())
}

#[derive(Debug)]

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
