use repository::Name;
use repository::{
    schema::InvoiceRowStatus, InvoiceRepository, RepositoryError, StorageConnection,
    TransactionError,
};

pub mod generate;
pub mod validate;

use generate::generate;
use validate::validate;

pub struct InsertOutboundShipment {
    pub id: String,
    pub other_party_id: String,
    pub status: InvoiceRowStatus,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
}

#[derive(Debug)]
pub enum InsertOutboundShipmentError {
    OtherPartyCannotBeThisStore,
    OtherPartyIdNotFound(String),
    OtherPartyNotACustomer(Name),
    InvoiceAlreadyExists,
    DatabaseError(RepositoryError),
}

/// Insert a new outbound shipment and returns the invoice id when successful.
pub fn insert_outbound_shipment(
    connection: &StorageConnection,
    store_id: &str,
    input: InsertOutboundShipment,
) -> Result<String, InsertOutboundShipmentError> {
    let new_invoice_id = connection.transaction_sync(|connection| {
        let other_party = validate(&input, connection)?;
        let new_invoice = generate(connection, store_id, input, other_party)?;
        InvoiceRepository::new(&connection).upsert_one(&new_invoice)?;

        Ok(new_invoice.id)
    })?;

    Ok(new_invoice_id)
}

impl From<RepositoryError> for InsertOutboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        InsertOutboundShipmentError::DatabaseError(error)
    }
}

impl From<TransactionError<InsertOutboundShipmentError>> for InsertOutboundShipmentError {
    fn from(error: TransactionError<InsertOutboundShipmentError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                InsertOutboundShipmentError::DatabaseError(RepositoryError::TransactionError {
                    msg,
                    level,
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}
