mod generate;
mod validate;

use generate::generate;
use repository::{InvoiceLine, InvoiceLineRowRepository, RepositoryError};
use validate::validate;

use crate::{
    invoice_line::{query::get_invoice_line, ShipmentTaxUpdate},
    service_provider::ServiceContext,
    WithDBError,
};

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

type OutError = UpdateOutboundShipmentServiceLineError;

pub fn update_outbound_shipment_service_line(
    ctx: &ServiceContext,
    _store_id: &str,
    input: UpdateOutboundShipmentServiceLine,
) -> Result<InvoiceLine, OutError> {
    let updated_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (existing_line, _, item) = validate(&input, &connection)?;
            let updated_line = generate(input, existing_line, item)?;
            InvoiceLineRowRepository::new(&connection).upsert_one(&updated_line)?;

            get_invoice_line(ctx, &updated_line.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(updated_line)
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
    UpdatedLineDoesNotExist,
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
