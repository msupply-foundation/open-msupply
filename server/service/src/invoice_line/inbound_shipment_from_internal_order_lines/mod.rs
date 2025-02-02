use repository::{
    InvoiceLine, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
    StockLineRowRepository,
};

mod validate;
use validate::{validate, ValidateResults};
mod generate;
use generate::{generate, GenerateResult};

use crate::service_provider::ServiceContext;

use super::query::get_invoice_line;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertFromInternalOrderLine {
    pub invoice_id: String,
    pub requisition_line_id: String,
}

#[derive(Debug, PartialEq, Clone)]
pub enum InsertFromInternalOrderLineError {
    InvoiceDoesNotExist,
    NotThisStoreInvoice,
    CannotEditFinalised,
    NotAnInboundShipment,
    RequisitionLineDoesNotExist,
    ItemDoesNotExist,
    RequisitionNotLinkedToInvoice,
    CannotAddLineFromInternalOrder,
    NewlyCreatedLineDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn insert_from_internal_order_line(
    ctx: &ServiceContext,
    input: InsertFromInternalOrderLine,
) -> Result<InvoiceLine, InsertFromInternalOrderLineError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let ValidateResults {
                invoice: old_invoice,
                requisition_line,
                item,
            } = validate(connection, &ctx.store_id, &input)?;

            let GenerateResult {
                invoice,
                invoice_line,
                stock_line,
            } = generate(
                connection,
                &ctx.user_id,
                item,
                old_invoice,
                requisition_line,
            )?;

            StockLineRowRepository::new(connection).upsert_one(&stock_line)?;
            InvoiceLineRowRepository::new(connection).upsert_one(&invoice_line)?;

            if let Some(invoice_row) = invoice {
                InvoiceRowRepository::new(connection).upsert_one(&invoice_row)?;
            }

            get_invoice_line(ctx, &invoice_line.id)
                .map_err(InsertFromInternalOrderLineError::DatabaseError)?
                .ok_or(InsertFromInternalOrderLineError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(new_line)
}

impl From<RepositoryError> for InsertFromInternalOrderLineError {
    fn from(error: RepositoryError) -> Self {
        InsertFromInternalOrderLineError::DatabaseError(error)
    }
}
