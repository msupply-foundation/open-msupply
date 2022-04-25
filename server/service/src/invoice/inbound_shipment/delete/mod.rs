use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceRowRepository,
    RepositoryError,
};

mod validate;

use validate::validate;

use crate::{
    invoice_line::inbound_shipment_line::{
        delete_inbound_shipment_line, DeleteInboundShipmentLine, DeleteInboundShipmentLineError,
    },
    service_provider::ServiceContext,
    WithDBError,
};

#[derive(Clone, Debug, Default, PartialEq)]
pub struct DeleteInboundShipment {
    pub id: String,
}

type OutError = DeleteInboundShipmentError;

pub fn delete_inbound_shipment(
    ctx: &ServiceContext,
    store_id: &str,
    user_id: &str,
    input: DeleteInboundShipment,
) -> Result<String, OutError> {
    let invoice_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;

            // TODO https://github.com/openmsupply/remote-server/issues/839
            let lines = InvoiceLineRepository::new(&connection).query_by_filter(
                InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&input.id)),
            )?;
            for line in lines {
                delete_inbound_shipment_line(
                    ctx,
                    store_id,
                    user_id,
                    DeleteInboundShipmentLine {
                        id: line.invoice_line_row.id.clone(),
                        invoice_id: input.id.clone(),
                    },
                )
                .map_err(|error| DeleteInboundShipmentError::LineDeleteError {
                    line_id: line.invoice_line_row.id,
                    error,
                })?;
            }
            // End TODO

            match InvoiceRowRepository::new(&connection).delete(&input.id) {
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
    LineDeleteError {
        line_id: String,
        error: DeleteInboundShipmentLineError,
    },
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
