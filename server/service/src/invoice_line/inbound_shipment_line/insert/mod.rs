use crate::{invoice_line::query::get_invoice_line, service_provider::ServiceContext, WithDBError};
use chrono::NaiveDate;
use repository::{
    InvoiceLine, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
    StockLineRowRepository,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

#[derive(Clone, Debug, Default, PartialEq)]
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

type OutError = InsertInboundShipmentLineError;

pub fn insert_inbound_shipment_line(
    ctx: &ServiceContext,
    _store_id: &str,
    user_id: &str,
    input: InsertInboundShipmentLine,
) -> Result<InvoiceLine, OutError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (item, invoice) = validate(&input, &connection)?;
            let (invoice_row_option, new_line, new_batch_option) =
                generate(user_id, input, item, invoice);

            if let Some(new_batch) = new_batch_option {
                StockLineRowRepository::new(&connection).upsert_one(&new_batch)?;
            }
            InvoiceLineRowRepository::new(&connection).upsert_one(&new_line)?;

            if let Some(invoice_row) = invoice_row_option {
                InvoiceRowRepository::new(&connection).upsert_one(&invoice_row)?;
            }

            get_invoice_line(ctx, &new_line.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(new_line)
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
    NewlyCreatedLineDoesNotExist,
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
