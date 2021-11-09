use crate::WithDBError;
use domain::outbound_shipment::InsertOutboundShipmentLine;
use repository::repository::{
    InvoiceLineRepository, RepositoryError, StockLineRepository, StorageConnectionManager,
    TransactionError,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

pub fn insert_outbound_shipment_line(
    connection_manager: &StorageConnectionManager,
    input: InsertOutboundShipmentLine,
) -> Result<String, InsertOutboundShipmentLineError> {
    let connection = connection_manager.connection()?;
    let new_line = connection
        .transaction_sync(|connection| {
            let (item, invoice, batch) = validate(&input, &connection)?;
            let (new_line, update_batch) = generate(input, item, batch, invoice)?;
            InvoiceLineRepository::new(&connection).upsert_one(&new_line)?;
            StockLineRepository::new(&connection).upsert_one(&update_batch)?;
            Ok(new_line)
        })
        .map_err(
            |error: TransactionError<InsertOutboundShipmentLineError>| match error {
                TransactionError::Transaction { msg } => {
                    RepositoryError::as_db_error(&msg, "").into()
                }
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(new_line.id)
}

pub enum InsertOutboundShipmentLineError {
    LineAlreadyExists,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    NotThisStoreInvoice,
    CannotEditFinalised,
    ItemNotFound,
    StockLineNotFound,
    NumberOfPacksBelowOne,
    StockLineAlreadyExistsInInvoice(String),
    ItemDoesNotMatchStockLine,
    BatchIsOnHold,
    ReductionBelowZero { stock_line_id: String },
}

impl From<RepositoryError> for InsertOutboundShipmentLineError {
    fn from(error: RepositoryError) -> Self {
        InsertOutboundShipmentLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertOutboundShipmentLineError
where
    ERR: Into<InsertOutboundShipmentLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
