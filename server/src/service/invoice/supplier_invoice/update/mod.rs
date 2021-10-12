use crate::{
    database::repository::{
        InvoiceRepository, RepositoryError, StockLineRepository, StorageConnectionManager,
    },
    domain::{name::Name, supplier_invoice::UpdateSupplierInvoice},
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

pub fn update_supplier_invoice(
    connection_manager: &StorageConnectionManager,
    patch: UpdateSupplierInvoice,
) -> Result<String, UpdateSupplierInvoiceError> {
    let connection = connection_manager.connection()?;
    // TODO do inside transaction
    let invoice = validate(&patch, &connection)?;
    let (stock_lines_option, update_invoice) = generate(invoice, patch, &connection)?;

    InvoiceRepository::new(&connection).upsert_one(&update_invoice)?;
    if let Some(stock_lines) = stock_lines_option {
        let repository = StockLineRepository::new(&connection);
        for stock_line in stock_lines {
            repository.upsert_one(&stock_line)?;
        }
    }

    Ok(update_invoice.id)
}

pub enum UpdateSupplierInvoiceError {
    InvoiceDoesNotExists,
    DatabaseError(RepositoryError),
    OtherPartyDoesNotExists,
    OtherPartyNotASupplier(Name),
    NotASupplierInvoice,
    NotThisStoreInvoice,
    CannotChangeInvoiceBackToDraft,
    CannotEditFinalised,
}

impl From<RepositoryError> for UpdateSupplierInvoiceError {
    fn from(error: RepositoryError) -> Self {
        UpdateSupplierInvoiceError::DatabaseError(error)
    }
}
