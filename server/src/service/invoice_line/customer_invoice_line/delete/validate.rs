use crate::{
    database::{repository::StorageConnection, schema::InvoiceLineRow},
    domain::{customer_invoice::DeleteCustomerInvoiceLine, invoice::InvoiceType},
    service::{
        invoice::{
            check_invoice_exists, check_invoice_finalised, check_invoice_type,
            validate::InvoiceIsFinalised, InvoiceDoesNotExist, WrongInvoiceType,
        },
        invoice_line::validate::{
            check_line_belongs_to_invoice, check_line_exists, LineDoesNotExist, NotInvoiceLine,
        },
    },
};

use super::DeleteCustomerInvoiceLineError;

pub fn validate(
    input: &DeleteCustomerInvoiceLine,
    connection: &StorageConnection,
) -> Result<InvoiceLineRow, DeleteCustomerInvoiceLineError> {
    let line = check_line_exists(&input.id, connection)?;
    let invoice = check_invoice_exists(&input.invoice_id, connection)?;

    check_line_belongs_to_invoice(&line, &invoice)?;
    check_invoice_type(&invoice, InvoiceType::CustomerInvoice)?;
    check_invoice_finalised(&invoice)?;

    Ok(line)
}

impl From<LineDoesNotExist> for DeleteCustomerInvoiceLineError {
    fn from(_: LineDoesNotExist) -> Self {
        DeleteCustomerInvoiceLineError::LineDoesNotExist
    }
}

impl From<WrongInvoiceType> for DeleteCustomerInvoiceLineError {
    fn from(_: WrongInvoiceType) -> Self {
        DeleteCustomerInvoiceLineError::NotACustomerInvoice
    }
}

impl From<InvoiceIsFinalised> for DeleteCustomerInvoiceLineError {
    fn from(_: InvoiceIsFinalised) -> Self {
        DeleteCustomerInvoiceLineError::CannotEditFinalised
    }
}

impl From<NotInvoiceLine> for DeleteCustomerInvoiceLineError {
    fn from(error: NotInvoiceLine) -> Self {
        DeleteCustomerInvoiceLineError::NotThisInvoiceLine(error.0)
    }
}

impl From<InvoiceDoesNotExist> for DeleteCustomerInvoiceLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        DeleteCustomerInvoiceLineError::InvoiceDoesNotExist
    }
}
