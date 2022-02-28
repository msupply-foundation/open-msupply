use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceRepository,
    RepositoryError, StorageConnectionManager, TransactionError,
};

mod validate;

use validate::validate;

use crate::{
    invoice_line::{
        delete_inbound_shipment_line, DeleteInboundShipmentLine, DeleteInboundShipmentLineError,
    },
    WithDBError,
};

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

    // TODO https://github.com/openmsupply/remote-server/issues/839
    let lines = InvoiceLineRepository::new(&connection)
        .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&input.id)))?;
    for line in lines {
        delete_inbound_shipment_line(
            connection_manager,
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

    InvoiceRepository::new(&connection).delete(&input.id)?;

    Ok(input.id)
}

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
