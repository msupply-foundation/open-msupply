use repository::{
    RepositoryError, StocktakeLineRowRepository, StorageConnection, TransactionError,
};

use crate::{
    service_provider::ServiceContext,
    stocktake::validate::{check_stocktake_exist, check_stocktake_not_finalised},
    stocktake_line::validate::check_stocktake_line_exist,
    validate::check_store_id_matches,
};

#[derive(Debug, PartialEq)]
pub enum DeleteStocktakeLineError {
    DatabaseError(RepositoryError),
    InternalError(String),
    InvalidStore,
    StocktakeLineDoesNotExist,
    CannotEditFinalised,
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    stocktake_line_id: &str,
) -> Result<(), DeleteStocktakeLineError> {
    let line = match check_stocktake_line_exist(connection, stocktake_line_id)? {
        Some(line) => line,
        None => return Err(DeleteStocktakeLineError::StocktakeLineDoesNotExist),
    };
    let stocktake = match check_stocktake_exist(connection, &line.stocktake_id)? {
        Some(stocktake) => stocktake,
        None => {
            return Err(DeleteStocktakeLineError::InternalError(format!(
                "Stocktake is missing: {}",
                line.stocktake_id
            )))
        }
    };
    if !check_stocktake_not_finalised(&stocktake.status) {
        return Err(DeleteStocktakeLineError::CannotEditFinalised);
    }
    if !check_store_id_matches(store_id, &stocktake.store_id) {
        return Err(DeleteStocktakeLineError::InvalidStore);
    }
    Ok(())
}

/// Returns the id of the deleted stocktake_line
pub fn delete_stocktake_line(
    ctx: &ServiceContext,
    store_id: &str,
    stocktake_line_id: &str,
) -> Result<String, DeleteStocktakeLineError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, store_id, stocktake_line_id)?;
            StocktakeLineRowRepository::new(&connection).delete(stocktake_line_id)?;
            Ok(())
        })
        .map_err(|error: TransactionError<DeleteStocktakeLineError>| error.to_inner_error())?;
    Ok(stocktake_line_id.to_string())
}

impl From<RepositoryError> for DeleteStocktakeLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteStocktakeLineError::DatabaseError(error)
    }
}
