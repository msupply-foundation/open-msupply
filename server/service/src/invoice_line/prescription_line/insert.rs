use crate::{
    invoice_line::{
        common_insert_line::{generate, validate, InsertInvoiceLine, InsertInvoiceLineError},
        query::get_invoice_line,
    },
    service_provider::ServiceContext,
};
use repository::{InvoiceLine, InvoiceLineRowRepository, InvoiceRowType, StockLineRowRepository};

type OutError = InsertInvoiceLineError;

pub fn insert_prescription_line(
    ctx: &ServiceContext,
    input: InsertInvoiceLine,
) -> Result<InvoiceLine, OutError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (item, invoice, batch) = validate(
                &input,
                &ctx.store_id,
                &connection,
                InvoiceRowType::Prescription,
            )?;
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
