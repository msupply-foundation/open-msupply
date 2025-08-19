use crate::{DomainError, DomainServiceError};
use repository::{RepositoryError, StockLineRowRepository, StorageConnection};

/// Handler for stock-related domain events
pub struct StockEventHandler<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockEventHandler<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        Self { connection }
    }

    pub fn handle_stock_added(
        &self,
        stock_line_id: &str,
        addition: f64,
    ) -> Result<(), DomainServiceError> {
        let stock_repo = StockLineRowRepository::new(self.connection);
        let mut stock_line = stock_repo
            .find_one_by_id(stock_line_id)?
            .ok_or(RepositoryError::NotFound)?;

        // For inbound operations, update both available and total stock
        stock_line.available_number_of_packs += addition;
        stock_line.total_number_of_packs += addition;

        stock_repo.upsert_one(&stock_line)?;
        Ok(())
    }

    pub fn handle_stock_added_available_only(
        &self,
        stock_line_id: &str,
        addition: f64,
    ) -> Result<(), DomainServiceError> {
        let stock_repo = StockLineRowRepository::new(self.connection);
        let mut stock_line = stock_repo
            .find_one_by_id(stock_line_id)?
            .ok_or(RepositoryError::NotFound)?;

        // For outbound reversals in New/Allocated status, only update available
        stock_line.available_number_of_packs += addition;

        stock_repo.upsert_one(&stock_line)?;
        Ok(())
    }

    pub fn handle_stock_created(
        &self,
        stock_line_id: &str,
        amount: f64,
    ) -> Result<(), DomainServiceError> {
        let stock_repo = StockLineRowRepository::new(self.connection);
        let mut stock_line = stock_repo
            .find_one_by_id(stock_line_id)?
            .ok_or(RepositoryError::NotFound)?;

        // For new stock creation, set both available and total
        stock_line.available_number_of_packs = amount;
        stock_line.total_number_of_packs = amount;

        stock_repo.upsert_one(&stock_line)?;
        Ok(())
    }

    pub fn handle_stock_reduced_available_only(
        &self,
        stock_line_id: &str,
        reduction: f64,
    ) -> Result<(), DomainServiceError> {
        let stock_repo = StockLineRowRepository::new(self.connection);
        let mut stock_line = stock_repo
            .find_one_by_id(stock_line_id)?
            .ok_or(RepositoryError::NotFound)?;

        // Check if reduction would cause negative stock
        if stock_line.available_number_of_packs < reduction {
            return Err(DomainError::InsufficientStock {
                stock_line_id: stock_line_id.to_string(),
                requested: reduction,
                available: stock_line.available_number_of_packs,
            }
            .into());
        }

        stock_line.available_number_of_packs -= reduction;
        stock_repo.upsert_one(&stock_line)?;
        Ok(())
    }

    pub fn handle_stock_reduced_available_and_total(
        &self,
        stock_line_id: &str,
        reduction: f64,
    ) -> Result<(), DomainServiceError> {
        let stock_repo = StockLineRowRepository::new(self.connection);
        let mut stock_line = stock_repo
            .find_one_by_id(stock_line_id)?
            .ok_or(RepositoryError::NotFound)?;

        // Check if reduction would cause negative stock
        if stock_line.available_number_of_packs < reduction {
            return Err(DomainError::InsufficientStock {
                stock_line_id: stock_line_id.to_string(),
                requested: reduction,
                available: stock_line.available_number_of_packs,
            }
            .into());
        }
        if stock_line.total_number_of_packs < reduction {
            return Err(DomainError::InsufficientStock {
                stock_line_id: stock_line_id.to_string(),
                requested: reduction,
                available: stock_line.total_number_of_packs,
            }
            .into());
        }

        stock_line.available_number_of_packs -= reduction;
        stock_line.total_number_of_packs -= reduction;

        stock_repo.upsert_one(&stock_line)?;
        Ok(())
    }
}
