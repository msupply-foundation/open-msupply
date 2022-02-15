use repository::{RepositoryError, StocktakeRowRepository, StorageConnection, TransactionError};

use crate::{service_provider::ServiceContext, validate::check_store_id_matches};

use super::validate::{
    check_no_stocktake_lines_exist, check_stocktake_exist, check_stocktake_not_finalised,
};

#[derive(Debug, PartialEq)]
pub enum DeleteStocktakeError {
    DatabaseError(RepositoryError),
    InvalidStore,
    StocktakeDoesNotExist,
    StocktakeLinesExist,
    CannotEditFinalised,
}

pub struct DeleteStocktakeInput {
    pub id: String,
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_id: &str,
) -> Result<(), DeleteStocktakeError> {
    let existing = match check_stocktake_exist(connection, stocktake_id)? {
        Some(existing) => existing,
        None => return Err(DeleteStocktakeError::StocktakeDoesNotExist),
    };
    if !check_store_id_matches(store_id, &existing.store_id) {
        return Err(DeleteStocktakeError::InvalidStore);
    }
    if !check_stocktake_not_finalised(&existing.status) {
        return Err(DeleteStocktakeError::CannotEditFinalised);
    }
    if !check_no_stocktake_lines_exist(connection, stocktake_id)? {
        return Err(DeleteStocktakeError::StocktakeLinesExist);
    }
    Ok(())
}

/// Returns the id of the deleted stocktake
pub fn delete_stocktake(
    ctx: &ServiceContext,
    store_id: &str,
    stocktake_id: &str,
) -> Result<String, DeleteStocktakeError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, store_id, stocktake_id)?;
            StocktakeRowRepository::new(&connection).delete(stocktake_id)?;
            Ok(())
        })
        .map_err(|error: TransactionError<DeleteStocktakeError>| error.to_inner_error())?;
    Ok(stocktake_id.to_string())
}

impl From<RepositoryError> for DeleteStocktakeError {
    fn from(error: RepositoryError) -> Self {
        DeleteStocktakeError::DatabaseError(error)
    }
}
