use crate::database::repository::{
    InvoiceRepository, RepositoryError, StorageConnection, StoreRepository,
};
use crate::database::schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType};

pub mod insert;
pub use self::insert::*;

pub mod update;
pub use self::update::*;

pub mod delete;
pub use self::delete::*;

pub fn current_store_id(connection: &StorageConnection) -> Result<String, RepositoryError> {
    // Need to check session for store
    Ok(StoreRepository::new(connection).all()?[0].id.clone())
}

pub fn check_invoice_exists(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, CommonErrors> {
    let result = InvoiceRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        return Err(CommonErrors::InvoiceDoesNotExists);
    }
    Ok(result?)
}

pub enum CommonErrors {
    InvoiceDoesNotExists,
    DatabaseError(RepositoryError),
    InvoiceIsFinalised,
    NotASupplierInvoice,
}

pub fn check_invoice_finalised(invoice: &InvoiceRow) -> Result<(), CommonErrors> {
    if invoice.status == InvoiceRowStatus::Finalised {
        Err(CommonErrors::InvoiceIsFinalised)
    } else {
        Ok(())
    }
}

pub struct InvoiceIsFinalised;

pub fn check_invoice_type(invoice: &InvoiceRow) -> Result<(), CommonErrors> {
    if invoice.r#type != InvoiceRowType::SupplierInvoice {
        Err(CommonErrors::NotASupplierInvoice)
    } else {
        Ok(())
    }
}

impl From<RepositoryError> for CommonErrors {
    fn from(error: RepositoryError) -> Self {
        CommonErrors::DatabaseError(error)
    }
}
