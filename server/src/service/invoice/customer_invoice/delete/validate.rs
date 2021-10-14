use crate::database::{
    repository::{
        InvoiceLineQueryRepository, InvoiceRepository, RepositoryError, StorageConnection,
    },
    schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType},
};

use super::DeleteCustomerInvoiceError;

pub fn validate(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, DeleteCustomerInvoiceError> {
    //  check invoice exists
    let result = InvoiceRepository::new(connection).find_one_by_id(id);
    if let Err(RepositoryError::NotFound) = &result {
        return Err(DeleteCustomerInvoiceError::InvoiceDoesNotExist);
    }
    let invoice = result?;

    // check invoice is not finalised
    if invoice.status == InvoiceRowStatus::Finalised {
        return Err(DeleteCustomerInvoiceError::CannotEditFinalised);
    }

    // check no lines exist for the invoice;
    let lines =
        InvoiceLineQueryRepository::new(connection).find_many_by_invoice_ids(&[id.to_string()])?;
    if lines.len() > 0 {
        return Err(DeleteCustomerInvoiceError::InvoiceLinesExists(lines));
    }

    // check its a customer invoice
    if invoice.r#type != InvoiceRowType::CustomerInvoice {
        return Err(DeleteCustomerInvoiceError::NotACustomerInvoice);
    }

    Ok(invoice)
}
