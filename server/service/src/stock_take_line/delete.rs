use repository::{
    RepositoryError, StockTakeLineRowRepository, StorageConnection, TransactionError,
};

use crate::{
    service_provider::ServiceContext,
    stock_take::validate::{check_stock_take_exist, check_stock_take_not_finalized},
    validate::check_store_id_matches,
};

use super::validate::check_stock_take_line_exist;

#[derive(Debug, PartialEq)]
pub enum DeleteStockTakeLineError {
    DatabaseError(RepositoryError),
    InternalError(String),
    InvalidStore,
    StockTakeLineDoesNotExist,
    CannotEditFinalised,
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    stock_take_line_id: &str,
) -> Result<(), DeleteStockTakeLineError> {
    let line = match check_stock_take_line_exist(connection, stock_take_line_id)? {
        Some(line) => line,
        None => {
            return Err(DeleteStockTakeLineError::StockTakeLineDoesNotExist(
                stock_take_line_id.to_string(),
            ))
        }
    };
    let stock_take = match check_stock_take_exist(connection, &line.stock_take_id)? {
        Some(stock_take) => stock_take,
        None => {
            return Err(DeleteStockTakeLineError::InternalError(format!(
                "Stock take is missing: {}",
                line.stock_take_id
            )))
        }
    };
    if !check_stock_take_not_finalized(&stock_take.status) {
        return Err(DeleteStockTakeLineError::CannotEditFinalised);
    }
    if !check_store_id_matches(store_id, &stock_take.store_id) {
        return Err(DeleteStockTakeLineError::InvalidStoreId(
            store_id.to_string(),
        ));
    }
    Ok(())
}

/// Returns the id of the deleted stock_take_line
pub fn delete_stock_take_line(
    ctx: &ServiceContext,
    store_id: &str,
    stock_take_line_id: &str,
) -> Result<String, DeleteStockTakeLineError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, store_id, stock_take_line_id)?;
            StockTakeLineRowRepository::new(&connection).delete(stock_take_line_id)?;
            Ok(())
        })
        .map_err(|error: TransactionError<DeleteStockTakeLineError>| error.to_inner_error())?;
    Ok(stock_take_line_id.to_string())
}

impl From<RepositoryError> for DeleteStockTakeLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteStockTakeLineError::DatabaseError(error)
    }
}
