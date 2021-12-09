mod generate;
mod validate;

use generate::generate;
use repository::{
    InvoiceLineRowRepository, RepositoryError, StorageConnectionManager, TransactionError,
};
use validate::validate;

use crate::WithDBError;

pub struct InsertOutboundShipmentServiceLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub name: Option<String>,
    pub total_before_tax: f64,
    pub total_after_tax: f64,
    pub tax: Option<f64>,
    pub note: Option<String>,
}

pub fn insert_outbound_shipment_service_line(
    connection_manager: &StorageConnectionManager,
    input: InsertOutboundShipmentServiceLine,
) -> Result<String, InsertOutboundShipmentServiceLineError> {
    let connection = connection_manager.connection()?;
    let new_line = connection
        .transaction_sync(|connection| {
            let (item_row, _) = validate(&input, &connection)?;
            let new_line = generate(input, item_row)?;
            InvoiceLineRowRepository::new(&connection).upsert_one(&new_line)?;
            Ok(new_line)
        })
        .map_err(
            |error: TransactionError<InsertOutboundShipmentServiceLineError>| match error {
                TransactionError::Transaction { msg, level } => {
                    RepositoryError::TransactionError { msg, level }.into()
                }
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(new_line.id)
}

pub enum InsertOutboundShipmentServiceLineError {
    LineAlreadyExists,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    //NotThisStoreInvoice,
    CannotEditFinalised,
    ItemNotFound,
    NotAServiceItem,
}

impl From<RepositoryError> for InsertOutboundShipmentServiceLineError {
    fn from(error: RepositoryError) -> Self {
        InsertOutboundShipmentServiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertOutboundShipmentServiceLineError
where
    ERR: Into<InsertOutboundShipmentServiceLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
