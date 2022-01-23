use repository::{RepositoryError, StockTakeRowRepository, StorageConnection, TransactionError};

use crate::{service_provider::ServiceContext, validate::check_store_id_matches};

use super::validate::{
    check_no_stock_take_lines_exist, check_stock_take_exist, check_stock_take_not_finalised,
};

#[derive(Debug, PartialEq)]
pub enum DeleteStockTakeError {
    DatabaseError(RepositoryError),
    InvalidStore,
    StockTakeDoesNotExist,
    StockTakeLinesExist,
    CannotEditFinalised,
}

pub struct DeleteStockTakeInput {
    pub id: String,
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    stock_take_id: &str,
) -> Result<(), DeleteStockTakeError> {
    let existing = match check_stock_take_exist(connection, stock_take_id)? {
        Some(existing) => existing,
        None => return Err(DeleteStockTakeError::StockTakeDoesNotExist),
    };
    if !check_store_id_matches(store_id, &existing.store_id) {
        return Err(DeleteStockTakeError::InvalidStore);
    }
    if !check_stock_take_not_finalised(&existing.status) {
        return Err(DeleteStockTakeError::CannotEditFinalised);
    }
    if !check_no_stock_take_lines_exist(connection, stock_take_id)? {
        return Err(DeleteStockTakeError::StockTakeLinesExist);
    }
    Ok(())
}

/// Returns the id of the deleted stock_take
pub fn delete_stock_take(
    ctx: &ServiceContext,
    store_id: &str,
    stock_take_id: &str,
) -> Result<String, DeleteStockTakeError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, store_id, stock_take_id)?;
            StockTakeRowRepository::new(&connection).delete(stock_take_id)?;
            Ok(())
        })
        .map_err(|error: TransactionError<DeleteStockTakeError>| error.to_inner_error())?;
    Ok(stock_take_id.to_string())
}

impl From<RepositoryError> for DeleteStockTakeError {
    fn from(error: RepositoryError) -> Self {
        DeleteStockTakeError::DatabaseError(error)
    }
}
