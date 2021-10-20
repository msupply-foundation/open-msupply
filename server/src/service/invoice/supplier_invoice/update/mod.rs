use crate::{
    database::repository::{
        InvoiceLineRepository, InvoiceRepository, RepositoryError, StockLineRepository,
        StorageConnectionManager, TransactionError,
    },
    domain::{name::Name, supplier_invoice::UpdateSupplierInvoice},
    service::WithDBError,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

use self::generate::LineAndStockLine;

pub fn update_supplier_invoice(
    connection_manager: &StorageConnectionManager,
    patch: UpdateSupplierInvoice,
) -> Result<String, UpdateSupplierInvoiceError> {
    let connection = connection_manager.connection()?;
    let update_invoice = connection
        .transaction_sync(|connection| {
            let invoice = validate(&patch, &connection)?;
            let (lines_and_invoice_lines_option, update_invoice) =
                generate(invoice, patch, &connection)?;

            InvoiceRepository::new(&connection).upsert_one(&update_invoice)?;

            if let Some(lines_and_invoice_lines) = lines_and_invoice_lines_option {
                let stock_line_repository = StockLineRepository::new(&connection);
                let invoice_line_respository = InvoiceLineRepository::new(&connection);

                for LineAndStockLine { line, stock_line } in lines_and_invoice_lines.into_iter() {
                    stock_line_repository.upsert_one(&stock_line)?;
                    invoice_line_respository.upsert_one(&line)?;
                }
            }
            Ok(update_invoice)
        })
        .map_err(
            |error: TransactionError<UpdateSupplierInvoiceError>| match error {
                TransactionError::Transaction { msg } => RepositoryError::DBError { msg }.into(),
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(update_invoice.id)
}

pub enum UpdateSupplierInvoiceError {
    InvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    OtherPartyDoesNotExist,
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

impl<ERR> From<WithDBError<ERR>> for UpdateSupplierInvoiceError
where
    ERR: Into<UpdateSupplierInvoiceError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
