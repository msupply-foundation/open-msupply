use crate::DomainServiceError;
use chrono::Utc;
use repository::{InvoiceRowRepository, RepositoryError, StorageConnection};

/// Handler for invoice-related domain events
pub struct InvoiceEventHandler<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InvoiceEventHandler<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        Self { connection }
    }

    // tODO - bring through the update picked date stuff - need to figure out where it goes...
    pub fn handle_picked_date_update(&self, invoice_id: &str) -> Result<(), DomainServiceError> {
        let invoice_repo = InvoiceRowRepository::new(self.connection);
        let mut invoice = invoice_repo
            .find_one_by_id(invoice_id)?
            .ok_or(RepositoryError::NotFound)?;

        invoice.picked_datetime = Some(Utc::now().naive_utc());
        invoice_repo.upsert_one(&invoice)?;
        Ok(())
    }
}
