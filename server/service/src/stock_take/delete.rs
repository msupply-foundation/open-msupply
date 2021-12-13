use repository::{RepositoryError, StockTakeRowRepository, StorageConnection, TransactionError};

use crate::{service_provider::ServiceContext, validate::check_store_exists};

use super::validate::check_stock_take_exist;

#[derive(Debug, PartialEq)]
pub enum DeleteStockTakeError {
    DatabaseError(RepositoryError),
    StockTakeDoesNotExist,
    InvalidStoreId,
}

pub struct DeleteStockTakeInput {
    pub id: String,
    pub store_id: String,
}

fn validate(
    connection: &StorageConnection,
    input: &DeleteStockTakeInput,
) -> Result<(), DeleteStockTakeError> {
    if !check_stock_take_exist(connection, &input.id)?.is_some() {
        return Err(DeleteStockTakeError::StockTakeDoesNotExist);
    }
    if !check_store_exists(connection, &input.store_id)? {
        return Err(DeleteStockTakeError::InvalidStoreId);
    }
    Ok(())
}

/// Returns the id of the deleted stock_take
pub fn delete_stock_take(
    ctx: &ServiceContext,
    input: DeleteStockTakeInput,
) -> Result<String, DeleteStockTakeError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            StockTakeRowRepository::new(&connection).delete(&input.id)?;
            Ok(())
        })
        .map_err(|error: TransactionError<DeleteStockTakeError>| error.to_inner_error())?;
    Ok(input.id)
}

impl From<RepositoryError> for DeleteStockTakeError {
    fn from(error: RepositoryError) -> Self {
        DeleteStockTakeError::DatabaseError(error)
    }
}
