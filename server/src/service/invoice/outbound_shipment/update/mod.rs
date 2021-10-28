use crate::{
    database::repository::{
        InvoiceRepository, RepositoryError, StockLineRepository, StorageConnectionManager,
        TransactionError,
    },
    domain::{name::Name, outbound_shipment::UpdateOutboundShipment},
};

pub mod generate;
pub mod validate;

use generate::generate;
use validate::validate;

pub fn update_outbound_shipment(
    connection_manager: &StorageConnectionManager,
    patch: UpdateOutboundShipment,
) -> Result<String, UpdateOutboundShipmentError> {
    let connection = connection_manager.connection()?;
    let updated_invoice_id = connection.transaction_sync(|connection| {
        let invoice = validate(&patch, &connection)?;
        let invoice_id = invoice.id.to_owned();
        let (stock_lines_option, update_invoice) = generate(invoice, patch, &connection)?;

        InvoiceRepository::new(&connection).upsert_one(&update_invoice)?;
        if let Some(stock_lines) = stock_lines_option {
            let repository = StockLineRepository::new(&connection);
            for stock_line in stock_lines {
                repository.upsert_one(&stock_line)?;
            }
        }
        Ok(invoice_id)
    })?;

    Ok(updated_invoice_id)
}

pub enum UpdateOutboundShipmentError {
    CannotChangeInvoiceBackToDraft,
    InvoiceDoesNotExists,
    InvoiceIsFinalised,
    DatabaseError(RepositoryError),
    OtherPartyDoesNotExists,
    OtherPartyNotACustomer(Name),
    OtherPartyCannotBeThisStore,
    NotAnOutboundShipment,
    /// Holds the id of the invalid invoice line
    InvoiceLineHasNoStockLine(String),
}

impl From<RepositoryError> for UpdateOutboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        UpdateOutboundShipmentError::DatabaseError(error)
    }
}

impl From<TransactionError<UpdateOutboundShipmentError>> for UpdateOutboundShipmentError {
    fn from(error: TransactionError<UpdateOutboundShipmentError>) -> Self {
        match error {
            TransactionError::Transaction { msg } => {
                UpdateOutboundShipmentError::DatabaseError(RepositoryError::DBError {
                    msg,
                    extra: "".to_string(),
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}
