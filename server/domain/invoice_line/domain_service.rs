use crate::{events::DomainEvent, DomainError, InvoiceLineDomain};
use chrono::Utc;
use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
    StockLineRowRepository, StorageConnection,
};

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
        match event {
            DomainEvent::StockAdded {
                stock_line_id,
                addition,
            } => {
                let stock_repo = StockLineRowRepository::new(self.connection);
                // Load the stock line and update stock
                let mut stock_line = stock_repo
                    .find_one_by_id(&stock_line_id)?
                    .ok_or(RepositoryError::NotFound)?;

                // For inbound operations (inbound shipments, customer returns),
                // update both available and total stock
                stock_line.available_number_of_packs += addition;
                stock_line.total_number_of_packs += addition;

                stock_repo.upsert_one(&stock_line)?;
                Ok(())
            }
            DomainEvent::StockAddedAvailableOnly {
                stock_line_id,
                addition,
            } => {
                let stock_repo = StockLineRowRepository::new(self.connection);
                // Load the stock line and update available stock only
                let mut stock_line = stock_repo
                    .find_one_by_id(&stock_line_id)?
                    .ok_or(RepositoryError::NotFound)?;

                // For outbound reversals in New/Allocated status, only update available
                stock_line.available_number_of_packs += addition;

                stock_repo.upsert_one(&stock_line)?;
                Ok(())
            }
            DomainEvent::StockCreated {
                stock_line_id,
                amount,
            } => {
                let stock_repo = StockLineRowRepository::new(self.connection);
                // Load the stock line and set stock levels
                let mut stock_line = stock_repo
                    .find_one_by_id(&stock_line_id)?
                    .ok_or(RepositoryError::NotFound)?;

                // For new stock creation, set both available and total
                stock_line.available_number_of_packs = amount;
                stock_line.total_number_of_packs = amount;

                stock_repo.upsert_one(&stock_line)?;
                Ok(())
            }
            DomainEvent::StockReducedAvailableOnly {
                stock_line_id,
                reduction,
            } => {
                let stock_repo = StockLineRowRepository::new(self.connection);
                // Load the stock line and reduce available stock only
                let mut stock_line = stock_repo
                    .find_one_by_id(&stock_line_id)?
                    .ok_or(RepositoryError::NotFound)?;

                // Check if reduction would cause negative stock
                if stock_line.available_number_of_packs < reduction {
                    return Err(DomainError::InsufficientStock {
                        stock_line_id: stock_line_id.clone(),
                        requested: reduction,
                        available: stock_line.available_number_of_packs,
                    }
                    .into());
                }

                // For outbound operations in New/Allocated status, only update available
                stock_line.available_number_of_packs -= reduction;

                stock_repo.upsert_one(&stock_line)?;
                Ok(())
            }
            DomainEvent::StockReducedAvailableAndTotal {
                stock_line_id,
                reduction,
            } => {
                let stock_repo = StockLineRowRepository::new(self.connection);
                // Load the stock line and reduce both available and total stock
                let mut stock_line = stock_repo
                    .find_one_by_id(&stock_line_id)?
                    .ok_or(RepositoryError::NotFound)?;

                // Check if reduction would cause negative stock
                if stock_line.available_number_of_packs < reduction {
                    return Err(DomainError::InsufficientStock {
                        stock_line_id: stock_line_id.clone(),
                        requested: reduction,
                        available: stock_line.available_number_of_packs,
                    }
                    .into());
                }
                if stock_line.total_number_of_packs < reduction {
                    return Err(DomainError::InsufficientStock {
                        stock_line_id: stock_line_id.clone(),
                        requested: reduction,
                        available: stock_line.total_number_of_packs,
                    }
                    .into());
                }

                // For outbound operations in Picked/Shipped status, update both
                stock_line.available_number_of_packs -= reduction;
                stock_line.total_number_of_packs -= reduction;

                stock_repo.upsert_one(&stock_line)?;
                Ok(())
            }
            DomainEvent::PickedDateUpdateRequired { invoice_id } => {
                let invoice_repo = InvoiceRowRepository::new(self.connection);
                // Load the invoice and update picked date to now
                let mut invoice = invoice_repo
                    .find_one_by_id(&invoice_id)?
                    .ok_or(RepositoryError::NotFound)?;

                invoice.picked_datetime = Some(chrono::Utc::now().naive_utc());
                invoice_repo.upsert_one(&invoice)?;
                Ok(())
            }
            DomainEvent::VVMStatusLogRequired {
                stock_line_id,
                vvm_status_id,
                invoice_line_id,
            } => {
                // TODO: Implement VVM status log creation when we have access to VVMStatusLogRepository
                // This would create a log entry tracking VVM status changes
                todo!("Implement VVM status log creation - needs VVMStatusLogRepository")
            }
            DomainEvent::BarcodeCreationRequired {
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
