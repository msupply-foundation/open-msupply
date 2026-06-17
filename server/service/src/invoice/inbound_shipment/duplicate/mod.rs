use crate::activity_log::activity_log_entry;
use crate::invoice::query::get_invoice;
use crate::service_provider::ServiceContext;
use repository::{
    ActivityLogType, Invoice, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
};

mod generate;
mod validate;

use generate::{generate, GenerateResult};
use validate::validate;

#[derive(Debug, PartialEq)]
pub enum DuplicateInboundShipmentError {
    InvoiceDoesNotExist,
    NotThisStoreInvoice,
    NotAnInboundShipment,
    NewlyCreatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
}
type OutError = DuplicateInboundShipmentError;

pub fn duplicate_inbound_shipment(
    ctx: &ServiceContext,
    source_id: String,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let source_invoice = validate(connection, &ctx.store_id, &source_id)?;
            let GenerateResult {
                new_invoice,
                new_lines,
            } = generate(connection, &ctx.store_id, &ctx.user_id, source_invoice)?;

            InvoiceRowRepository::new(connection).upsert_one(&new_invoice)?;

            let invoice_line_row_repository = InvoiceLineRowRepository::new(connection);
            for line in new_lines.iter() {
                invoice_line_row_repository.upsert_one(line)?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::InvoiceCreated,
                Some(new_invoice.id.clone()),
                None,
                None,
            )?;

            get_invoice(ctx, None, &new_invoice.id, None)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

impl From<RepositoryError> for DuplicateInboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        DuplicateInboundShipmentError::DatabaseError(error)
    }
}
