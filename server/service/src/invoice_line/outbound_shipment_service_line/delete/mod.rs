use crate::{
    invoice_line::DeleteOutboundShipmentLine, service_provider::ServiceContext, WithDBError,
};
use repository::{InvoiceLineRowRepository, RepositoryError};

mod validate;

use validate::validate;

type OutError = DeleteOutboundShipmentServiceLineError;

pub fn delete_outbound_shipment_service_line(
    ctx: &ServiceContext,
    _store_id: &str,
    input: DeleteOutboundShipmentLine,
) -> Result<String, OutError> {
    let line_id = ctx
        .connection
        .transaction_sync(|connection| {
            let line = validate(&input, &connection)?;
            InvoiceLineRowRepository::new(&connection).delete(&line.id)?;

            Ok(line.id) as Result<String, OutError>
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(line_id)
}

#[derive(Debug)]

pub enum DeleteOutboundShipmentServiceLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    NotThisStoreInvoice,
    ItemNotFound,
    CannotEditFinalised,
    NotThisInvoiceLine(String),
    NotAServiceItem,
}

impl From<RepositoryError> for DeleteOutboundShipmentServiceLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteOutboundShipmentServiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteOutboundShipmentServiceLineError
where
    ERR: Into<DeleteOutboundShipmentServiceLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
