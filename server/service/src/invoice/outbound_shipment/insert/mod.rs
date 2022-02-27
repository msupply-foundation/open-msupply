use repository::{Invoice, InvoiceRepository, Name};
use repository::{RepositoryError, TransactionError};

pub mod generate;
pub mod validate;

use generate::generate;
use validate::validate;

use crate::invoice::query::get_invoice;
use crate::service_provider::ServiceContext;

pub struct InsertOutboundShipment {
    pub id: String,
    pub other_party_id: String,
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
    NewlyCreatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = InsertOutboundShipmentError;

/// Insert a new outbound shipment and returns the invoice when successful.
pub fn insert_outbound_shipment(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertOutboundShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let other_party = validate(&input, connection)?;
            let new_invoice = generate(connection, store_id, input, other_party)?;

            InvoiceRepository::new(&connection).upsert_one(&new_invoice)?;

            get_invoice(ctx, None, &new_invoice.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
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
