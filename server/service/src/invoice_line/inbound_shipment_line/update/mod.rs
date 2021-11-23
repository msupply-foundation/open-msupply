use crate::WithDBError;
use domain::inbound_shipment::UpdateInboundShipmentLine;
use repository::{
    InvoiceLineRowRepository, RepositoryError, StockLineRowRepository, StorageConnectionManager,
    TransactionError,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

pub fn update_inbound_shipment_line(
    connection_manager: &StorageConnectionManager,
    input: UpdateInboundShipmentLine,
) -> Result<String, UpdateInboundShipmentLineError> {
    let connection = connection_manager.connection()?;
    let updated_line = connection
        .transaction_sync(|connection| {
            let (line, item, invoice) = validate(&input, &connection)?;

            let (updated_line, upsert_batch_option, delete_batch_id_option) =
                generate(input, line, item, invoice, &connection)?;

            let stock_line_respository = StockLineRowRepository::new(&connection);

            if let Some(upsert_batch) = upsert_batch_option {
                stock_line_respository.upsert_one(&upsert_batch)?;
            }

            InvoiceLineRowRepository::new(&connection).upsert_one(&updated_line)?;

            if let Some(id) = delete_batch_id_option {
                stock_line_respository.delete(&id)?;
            }
            Ok(updated_line)
        })
        .map_err(
            |error: TransactionError<UpdateInboundShipmentLineError>| match error {
                TransactionError::Transaction { msg } => {
                    RepositoryError::as_db_error(&msg, "").into()
                }
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(updated_line.id)
}
pub enum UpdateInboundShipmentLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnInboundShipment,
    NotThisStoreInvoice,
    CannotEditFinalised,
    LocationDoesNotExists,
    ItemNotFound,
    PackSizeBelowOne,
    NumberOfPacksBelowOne,
    BatchIsReserved,
    NotThisInvoiceLine(String),
}

impl From<RepositoryError> for UpdateInboundShipmentLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateInboundShipmentLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateInboundShipmentLineError
where
    ERR: Into<UpdateInboundShipmentLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
