pub mod generate;
pub mod validate;

use crate::{invoice::query::get_invoice, service_provider::ServiceContext};
use generate::{generate, GenerateResult};
use repository::{
    ActivityLogRowRepository, Invoice, InvoiceLineRowRepository, InvoiceRowRepository,
    RepositoryError,
};
use validate::validate;

#[derive(Clone, Debug, PartialEq, Default)]
pub struct UpdateOutboundReturnName {
    pub id: String,
    pub other_party_id: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateOutboundReturnNameError {
    InvoiceDoesNotExist,
    InvoiceIsNotEditable,
    NotAnOutboundReturn,
    NotThisStoreInvoice,
    // Name validation
    OtherPartyNotASupplier,
    OtherPartyNotVisible,
    OtherPartyDoesNotExist,
    // Internal
    UpdatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = UpdateOutboundReturnNameError;

pub fn update_outbound_return_name(
    ctx: &ServiceContext,
    patch: UpdateOutboundReturnName,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice, other_party_option) = validate(connection, &ctx.store_id, &patch)?;
            let GenerateResult {
                old_invoice,
                old_invoice_lines,
                new_invoice,
                new_invoice_lines,
                new_activity_log,
            } = generate(connection, invoice, other_party_option, patch.clone())?;

            let invoice_repo = InvoiceRowRepository::new(connection);
            let invoice_line_repo = InvoiceLineRowRepository::new(connection);
            invoice_repo.upsert_one(&new_invoice)?;

            for new_invoice_line in new_invoice_lines {
                invoice_line_repo.upsert_one(&new_invoice_line.invoice_line_row)?;
            }

            for old_invoice_line in old_invoice_lines {
                invoice_line_repo.delete(&old_invoice_line.invoice_line_row.id)?;
            }

            invoice_repo.delete(&old_invoice.id)?;

            for new_activity in new_activity_log {
                ActivityLogRowRepository::new(connection).insert_one(&new_activity)?;
            }

            get_invoice(ctx, None, &new_invoice.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::UpdatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    ctx.processors_trigger.trigger_invoice_transfer_processors();

    Ok(invoice)
}

impl From<RepositoryError> for UpdateOutboundReturnNameError {
    fn from(error: RepositoryError) -> Self {
        UpdateOutboundReturnNameError::DatabaseError(error)
    }
}
