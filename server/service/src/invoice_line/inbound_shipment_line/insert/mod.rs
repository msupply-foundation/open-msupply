use crate::WithDBError;
use chrono::NaiveDate;
use repository::{
    InvoiceLineRowRepository, RepositoryError, StockLineRowRepository, StorageConnection,
    TransactionError,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

pub struct InsertInboundShipmentLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub location_id: Option<String>,
    pub pack_size: u32,
    pub batch: Option<String>,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: u32,
    pub total_before_tax: f64,
    pub total_after_tax: f64,
    pub tax: Option<f64>,
}

pub fn insert_inbound_shipment_line(
    connection: &StorageConnection,
    input: InsertInboundShipmentLine,
) -> Result<String, InsertInboundShipmentLineError> {
    let new_line = connection
        .transaction_sync(|connection| {
            let (item, invoice) = validate(&input, &connection)?;
            let (new_line, new_batch_option) = generate(input, item, invoice);

            if let Some(new_batch) = new_batch_option {
                StockLineRowRepository::new(&connection).upsert_one(&new_batch)?;
            }
            InvoiceLineRowRepository::new(&connection).upsert_one(&new_line)?;
            Ok(new_line)
        })
        .map_err(
            |error: TransactionError<InsertInboundShipmentLineError>| match error {
                TransactionError::Transaction { msg, level } => {
                    RepositoryError::TransactionError { msg, level }.into()
                }
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(new_line.id)
}

#[derive(Debug)]
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
