use crate::WithDBError;
use repository::{
    InvoiceLineRowRepository, RepositoryError, StockLineRowRepository, StorageConnection,
    TransactionError,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

pub struct InsertOutboundShipmentLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub stock_line_id: String,
    pub number_of_packs: u32,
    pub total_before_tax: f64,
    pub total_after_tax: f64,
    pub tax: Option<f64>,
}

pub fn insert_outbound_shipment_line(
    connection: &StorageConnection,
    input: InsertOutboundShipmentLine,
) -> Result<String, InsertOutboundShipmentLineError> {
    let new_line = connection
        .transaction_sync(|connection| {
            let (item, invoice, batch) = validate(&input, &connection)?;
            let (new_line, update_batch) = generate(input, item, batch, invoice)?;
            InvoiceLineRowRepository::new(&connection).upsert_one(&new_line)?;
            StockLineRowRepository::new(&connection).upsert_one(&update_batch)?;
            Ok(new_line)
        })
        .map_err(
            |error: TransactionError<InsertOutboundShipmentLineError>| match error {
                TransactionError::Transaction { msg, level } => {
                    RepositoryError::TransactionError { msg, level }.into()
                }
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(new_line.id)
}

#[derive(Debug)]
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
    LocationIsOnHold,
    LocationNotFound,
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
