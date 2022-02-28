use repository::{InvoiceLine, InvoiceRepository, RepositoryError};

mod validate;

use validate::validate;

use crate::{service_provider::ServiceContext, WithDBError};

#[derive(Clone, Debug, Default, PartialEq)]
pub struct DeleteInboundShipment {
    pub id: String,
}

type OutError = DeleteInboundShipmentError;

pub fn delete_inbound_shipment(
    ctx: &ServiceContext,
    _store_id: &str,
    input: DeleteInboundShipment,
) -> Result<String, OutError> {
    let invoice_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            match InvoiceRepository::new(&connection).delete(&input.id) {
                Ok(_) => Ok(input.id),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice_id)
}

#[derive(Debug, PartialEq)]
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
