use crate::WithDBError;
use domain::inbound_shipment::InsertInboundShipmentLine;
use repository::{
    InvoiceLineRowRepository, RepositoryError, StockLineRowRepository, StorageConnectionManager,
    TransactionError,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

pub fn insert_inbound_shipment_line(
    connection_manager: &StorageConnectionManager,
    input: InsertInboundShipmentLine,
) -> Result<String, InsertInboundShipmentLineError> {
    let connection = connection_manager.connection()?;
    let new_line = connection
        .transaction_sync(|connection| {
            let (item, invoice) = validate(&input, &connection)?;
            let (new_line, new_batch_option) = generate(input, item, invoice, connection)?;

            if let Some(new_batch) = new_batch_option {
                StockLineRowRepository::new(&connection).upsert_one(&new_batch)?;
            }
            InvoiceLineRowRepository::new(&connection).upsert_one(&new_line)?;
            Ok(new_line)
        })
        .map_err(
            |error: TransactionError<InsertInboundShipmentLineError>| match error {
                TransactionError::Transaction { msg } => {
                    RepositoryError::as_db_error(&msg, "").into()
                }
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(new_line.id)
}

pub enum InsertInboundShipmentLineError {
    LineAlreadyExists,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnInboundShipment,
    NotThisStoreInvoice,
    CannotEditFinalised,
    LocationDoesNotExist,
    ItemNotFound,
    PackSizeBelowOne,
    NumberOfPacksBelowOne,
}

impl From<RepositoryError> for InsertInboundShipmentLineError {
    fn from(error: RepositoryError) -> Self {
        InsertInboundShipmentLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertInboundShipmentLineError
where
    ERR: Into<InsertInboundShipmentLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
