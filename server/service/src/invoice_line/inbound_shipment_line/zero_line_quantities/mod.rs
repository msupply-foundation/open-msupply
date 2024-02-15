use crate::{
    activity_log::activity_log_entry, invoice_line::get_invoice_line,
    service_provider::ServiceContext,
};
use repository::{
    ActivityLogType, InvoiceLine, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
    StockLineRowRepository,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

use self::generate::GenerateResult;

/// For invoices that were created before store.
#[derive(Clone, Debug, PartialEq, Default)]
pub struct ZeroInboundShipmentLineQuantities {
    pub id: String,
}

#[derive(Debug, PartialEq)]
pub enum ZeroInboundShipmentLineQuantitiesError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnInboundShipment,
    NotThisStoreInvoice,
    CannotEditFinalised,
    BatchIsReserved,
    InvoiceWasCreatedAfterStore,
    NotThisInvoiceLine(String),
}

pub fn zero_inbound_shipment_line_quantities(
    ctx: &ServiceContext,
    input: ZeroInboundShipmentLineQuantities,
) -> Result<InvoiceLine, ZeroInboundShipmentLineQuantitiesError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice_row, line) = validate(&input, &ctx.store_id, connection)?;

            let GenerateResult {
                invoice_row,
                new_line,
                stock_line_id,
            } = generate(&ctx.user_id, invoice_row, line);

            InvoiceLineRowRepository::new(connection).upsert_one(&new_line)?;
            InvoiceRowRepository::new(connection).upsert_one(&invoice_row)?;

            if let Some(id) = stock_line_id {
                StockLineRowRepository::new(connection).delete(&id)?;
            }

            activity_log_entry(
                ctx,
                ActivityLogType::ZeroInvoiceCreatedBeforeStore,
                Some(invoice_row.id.to_string()),
                None,
                None,
            )?;

            get_invoice_line(ctx, &new_line.id)
                .map_err(ZeroInboundShipmentLineQuantitiesError::DatabaseError)?
                .ok_or(ZeroInboundShipmentLineQuantitiesError::LineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(new_line)
}

impl From<RepositoryError> for ZeroInboundShipmentLineQuantitiesError {
    fn from(error: RepositoryError) -> Self {
        ZeroInboundShipmentLineQuantitiesError::DatabaseError(error)
    }
}
