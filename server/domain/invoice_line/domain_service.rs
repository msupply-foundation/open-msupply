use crate::{events::DomainEvent, DomainError, InvoiceLineDomain};
use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
    StorageConnection,
};

use super::handlers::{InvoiceEventHandler, StockEventHandler};

#[derive(Debug)]
pub enum DomainServiceError {
    Domain(DomainError),
    Repository(RepositoryError),
}

impl From<RepositoryError> for DomainServiceError {
    fn from(error: RepositoryError) -> Self {
        DomainServiceError::Repository(error)
    }
}

impl From<DomainError> for DomainServiceError {
    fn from(error: DomainError) -> Self {
        DomainServiceError::Domain(error)
    }
}

impl std::fmt::Display for DomainServiceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DomainServiceError::Domain(e) => write!(f, "Domain error: {}", e),
            DomainServiceError::Repository(e) => write!(f, "Repository error: {:?}", e),
        }
    }
}

impl std::error::Error for DomainServiceError {}

/// Domain service for coordinating invoice line operations and side effects
pub struct InvoiceLineDomainService<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InvoiceLineDomainService<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        Self { connection }
    }

    /// Load an invoice line domain model by ID
    pub fn load_invoice_line(
        &self,
        line_id: &str,
    ) -> Result<InvoiceLineDomain, DomainServiceError> {
        let line_repo = InvoiceLineRowRepository::new(self.connection);
        let invoice_repo = InvoiceRowRepository::new(self.connection);

        let line = line_repo
            .find_one_by_id(line_id)?
            .ok_or(RepositoryError::NotFound)?;

        let invoice = invoice_repo
            .find_one_by_id(&line.invoice_id)?
            .ok_or(RepositoryError::NotFound)?;

        Ok(InvoiceLineDomain::new(line, invoice))
    }

    /// Execute domain model changes and process events in a transaction
    pub fn execute_with_events(
        &self,
        domain_model: InvoiceLineDomain,
        events: Vec<DomainEvent>,
    ) -> Result<InvoiceLineRow, DomainServiceError> {
        let line_repo = InvoiceLineRowRepository::new(self.connection);

        // Save the main invoice line change
        let updated_line = domain_model.line.clone();
        line_repo.upsert_one(&updated_line)?;

        // Process all domain events
        for event in events {
            self.process_event(event)?;
        }

        Ok(updated_line)
    }

    /// Process a single domain event
    fn process_event(&self, event: DomainEvent) -> Result<(), DomainServiceError> {
        let stock_handler = StockEventHandler::new(self.connection);
        let invoice_handler = InvoiceEventHandler::new(self.connection);

        match event {
            DomainEvent::StockAdded {
                stock_line_id,
                addition,
            } => stock_handler.handle_stock_added(&stock_line_id, addition),

            DomainEvent::StockAddedAvailableOnly {
                stock_line_id,
                addition,
            } => stock_handler.handle_stock_added_available_only(&stock_line_id, addition),

            DomainEvent::StockCreated {
                stock_line_id,
                amount,
            } => stock_handler.handle_stock_created(&stock_line_id, amount),

            DomainEvent::StockReducedAvailableOnly {
                stock_line_id,
                reduction,
            } => stock_handler.handle_stock_reduced_available_only(&stock_line_id, reduction),

            DomainEvent::StockReduced {
                stock_line_id,
                reduction,
            } => stock_handler.handle_stock_reduced_available_and_total(&stock_line_id, reduction),

            DomainEvent::PickedDateUpdateRequired { invoice_id } => {
                invoice_handler.handle_picked_date_update(&invoice_id)
            }

            DomainEvent::VVMStatusChanged {
                stock_line_id,
                vvm_status_id,
                invoice_line_id,
            } => {
                // TODO: Implement VVM status log creation when we have access to VVMStatusLogRepository
                // This would create a log entry tracking VVM status changes
                todo!("Implement VVM status log creation - needs VVMStatusLogRepository")
            }

            DomainEvent::BarcodeCreated {
                gtin,
                item_id,
                pack_size,
            } => {
                // TODO: Implement barcode creation when we have access to BarcodeRepository
                // This would create a new barcode record
                todo!("Implement barcode creation - needs BarcodeRepository")
            }
        }
    }
}
