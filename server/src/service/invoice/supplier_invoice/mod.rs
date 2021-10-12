use crate::database::repository::{
    InvoiceRepository, NameQueryRepository, RepositoryError, StorageConnection, StoreRepository,
};
use crate::database::schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType};
use crate::domain::name::{Name, NameFilter};
use crate::domain::Pagination;

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
) -> Result<InvoiceRow, CommonError> {
    let result = InvoiceRepository::new(connection).find_one_by_id(id);

    if let Err(RepositoryError::NotFound) = &result {
        return Err(CommonError::InvoiceDoesNotExists);
    }
    Ok(result?)
}

pub enum CommonError {
    InvoiceDoesNotExists,
    DatabaseError(RepositoryError),
    InvoiceIsFinalised,
    NotASupplierInvoice,
}

pub fn check_invoice_finalised(invoice: &InvoiceRow) -> Result<(), CommonError> {
    if invoice.status == InvoiceRowStatus::Finalised {
        Err(CommonError::InvoiceIsFinalised)
    } else {
        Ok(())
    }
}

pub struct InvoiceIsFinalised;

pub fn check_invoice_type(invoice: &InvoiceRow) -> Result<(), CommonError> {
    if invoice.r#type != InvoiceRowType::SupplierInvoice {
        Err(CommonError::NotASupplierInvoice)
    } else {
        Ok(())
    }
}

impl From<RepositoryError> for CommonError {
    fn from(error: RepositoryError) -> Self {
        CommonError::DatabaseError(error)
    }
}

pub enum OtherPartyError {
    NotASupplier(Name),
    DatabaseError(RepositoryError),
    DoesNotExist,
}

fn check_other_party(
    id: Option<String>,
    connection: &StorageConnection,
) -> Result<(), OtherPartyError> {
    use OtherPartyError::*;
    if let Some(id) = id {
        let repository = NameQueryRepository::new(&connection);

        let mut result = repository.query(
            Pagination::one(),
            Some(NameFilter::new().match_id(&id)),
            None,
        )?;

        if let Some(name) = result.pop() {
            if name.is_supplier {
                Ok(())
            } else {
                Err(NotASupplier(name))
            }
        } else {
            Err(DoesNotExist)
        }
    } else {
        Ok(())
    }
}

impl From<RepositoryError> for OtherPartyError {
    fn from(error: RepositoryError) -> Self {
        OtherPartyError::DatabaseError(error)
    }
}
