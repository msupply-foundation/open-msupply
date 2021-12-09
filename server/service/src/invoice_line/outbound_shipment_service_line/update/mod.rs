mod generate;
mod validate;

use domain::shipment_tax_update::ShipmentTaxUpdate;
use generate::generate;
use repository::{
    InvoiceLineRowRepository, RepositoryError, StorageConnectionManager, TransactionError,
};
use validate::validate;

use crate::WithDBError;

pub struct UpdateOutboundShipmentServiceLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: Option<String>,
    pub name: Option<String>,
    pub total_before_tax: Option<f64>,
    pub total_after_tax: Option<f64>,
    pub tax: Option<ShipmentTaxUpdate>,
    pub note: Option<String>,
}

pub fn update_outbound_shipment_service_line(
    connection_manager: &StorageConnectionManager,
    input: UpdateOutboundShipmentServiceLine,
) -> Result<String, UpdateOutboundShipmentServiceLineError> {
    let connection = connection_manager.connection()?;
    let new_line = connection
        .transaction_sync(|connection| {
            let (existing_line, _, item) = validate(&input, &connection)?;
            let new_line = generate(input, existing_line, item)?;
            InvoiceLineRowRepository::new(&connection).upsert_one(&new_line)?;
            Ok(new_line)
        })
        .map_err(
            |error: TransactionError<UpdateOutboundShipmentServiceLineError>| match error {
                TransactionError::Transaction { msg, level } => {
                    RepositoryError::TransactionError { msg, level }.into()
                }
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(new_line.id)
}

#[derive(Debug)]
pub enum UpdateOutboundShipmentServiceLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    // NotThisStoreInvoice,
    NotThisInvoiceLine(String),
    CannotEditFinalised,
    ItemNotFound,
    NotAServiceItem,
}

impl From<RepositoryError> for UpdateOutboundShipmentServiceLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateOutboundShipmentServiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateOutboundShipmentServiceLineError
where
    ERR: Into<UpdateOutboundShipmentServiceLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
