use crate::invoice::query::get_invoice;
use crate::service_provider::ServiceContext;
use crate::WithDBError;
use repository::{Invoice, Name};
use repository::{InvoiceRepository, RepositoryError};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

#[derive(Clone, Debug, Default)]
pub struct InsertInboundShipment {
    pub id: String,
    pub other_party_id: String,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
}

type OutError = InsertInboundShipmentError;

pub fn insert_inbound_shipment(
    ctx: &ServiceContext,
    store_id: &str,
    user_id: &str,
    input: InsertInboundShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let other_party = validate(&input, &connection)?;
            let new_invoice = generate(connection, store_id, user_id, input, other_party)?;
            InvoiceRepository::new(&connection).upsert_one(&new_invoice)?;
            get_invoice(ctx, None, &new_invoice.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(invoice)
}

#[derive(Debug)]
pub enum InsertInboundShipmentError {
    InvoiceAlreadyExists,
    DatabaseError(RepositoryError),
    OtherPartyDoesNotExist,
    NewlyCreatedInvoiceDoesNotExist,
    OtherPartyNotASupplier(Name),
}

impl From<RepositoryError> for InsertInboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        InsertInboundShipmentError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertInboundShipmentError
where
    ERR: Into<InsertInboundShipmentError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
