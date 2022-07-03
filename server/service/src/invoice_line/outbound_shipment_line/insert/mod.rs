use crate::{invoice_line::query::get_invoice_line, service_provider::ServiceContext, WithDBError};
use repository::{InvoiceLine, InvoiceLineRowRepository, RepositoryError, StockLineRowRepository};

mod generate;
mod validate;

use generate::generate;
use validate::validate;
#[derive(Clone, Debug, PartialEq, Default)]
pub struct InsertOutboundShipmentLine {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub stock_line_id: String,
    pub number_of_packs: u32,
    pub total_before_tax: Option<f64>,
    pub total_after_tax: f64,
    pub tax: Option<f64>,
}

type OutError = InsertOutboundShipmentLineError;

pub fn insert_outbound_shipment_line(
    ctx: &ServiceContext,
    _store_id: &str,
    input: InsertOutboundShipmentLine,
) -> Result<InvoiceLine, OutError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (item, invoice, batch) = validate(&input, &connection)?;
            let (new_line, update_batch) = generate(input, item, batch, invoice)?;
            InvoiceLineRowRepository::new(&connection).upsert_one(&new_line)?;
            StockLineRowRepository::new(&connection).upsert_one(&update_batch)?;
            get_invoice_line(ctx, &new_line.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(new_line)
}

#[derive(Clone, Debug, PartialEq)]
pub enum InsertOutboundShipmentLineError {
    LineAlreadyExists,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    NotThisStoreInvoice,
    CannotEditFinalised,
    ItemNotFound,
    StockLineNotFound,
    NumberOfPacksBelowOne,
    LocationIsOnHold,
    LocationNotFound,
    StockLineAlreadyExistsInInvoice(String),
    ItemDoesNotMatchStockLine,
    NewlyCreatedLineDoesNotExist,
    BatchIsOnHold,
    ReductionBelowZero { stock_line_id: String },
}

impl From<RepositoryError> for InsertOutboundShipmentLineError {
    fn from(error: RepositoryError) -> Self {
        InsertOutboundShipmentLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertOutboundShipmentLineError
where
    ERR: Into<InsertOutboundShipmentLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
