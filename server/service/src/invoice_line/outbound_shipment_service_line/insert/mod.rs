mod generate;
mod validate;

use generate::generate;
use repository::{InvoiceLine, InvoiceLineRowRepository, RepositoryError};
use validate::validate;

use crate::{invoice_line::query::get_invoice_line, service_provider::ServiceContext, WithDBError};

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

type OutError = InsertOutboundShipmentServiceLineError;

pub fn insert_outbound_shipment_service_line(
    ctx: &ServiceContext,
    _store_id: &str,
    input: InsertOutboundShipmentServiceLine,
) -> Result<InvoiceLine, OutError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (item_row, _) = validate(&input, &connection)?;
            let new_line = generate(input, item_row)?;
            InvoiceLineRowRepository::new(&connection).upsert_one(&new_line)?;
            get_invoice_line(ctx, &new_line.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(new_line)
}

#[derive(Debug)]
pub enum InsertOutboundShipmentServiceLineError {
    LineAlreadyExists,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    //NotThisStoreInvoice,
    CannotEditFinalised,
    ItemNotFound,
    NotAServiceItem,
    NewlyCreatedLineDoesNotExist,
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
