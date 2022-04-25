use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceRowRepository,
    RepositoryError, TransactionError,
};

pub mod validate;

use validate::validate;

use crate::{
    invoice_line::outbound_shipment_line::{
        delete_outbound_shipment_line, DeleteOutboundShipmentLine, DeleteOutboundShipmentLineError,
    },
    service_provider::ServiceContext,
    WithDBError,
};

type OutError = DeleteOutboundShipmentError;

pub fn delete_outbound_shipment(
    ctx: &ServiceContext,
    store_id: &str,
    id: String,
) -> Result<String, DeleteOutboundShipmentError> {
    let invoice_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&id, &connection)?;

            // TODO https://github.com/openmsupply/remote-server/issues/839
            let lines = InvoiceLineRepository::new(&connection)
                .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&id)))?;
            for line in lines {
                delete_outbound_shipment_line(
                    ctx,
                    store_id,
                    DeleteOutboundShipmentLine {
                        id: line.invoice_line_row.id.clone(),
                        invoice_id: id.clone(),
                    },
                )
                .map_err(|error| DeleteOutboundShipmentError::LineDeleteError {
                    line_id: line.invoice_line_row.id,
                    error,
                })?;
            }

            InvoiceRowRepository::new(&connection).delete(&id)?;
            // End TODO

            match InvoiceRowRepository::new(&connection).delete(&id) {
                Ok(_) => Ok(id),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(invoice_id)
}

#[derive(Debug, PartialEq, Clone)]

pub enum DeleteOutboundShipmentError {
    InvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    NotThisStoreInvoice,
    CannotEditFinalised,
    InvoiceLinesExists(Vec<InvoiceLine>),
    LineDeleteError {
        line_id: String,
        error: DeleteOutboundShipmentLineError,
    },
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
