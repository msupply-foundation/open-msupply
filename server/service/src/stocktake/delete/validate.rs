use repository::{RepositoryError, StorageConnection};

use crate::{
    stocktake::{check_stocktake_exist, check_stocktake_not_finalised},
    validate::check_store_id_matches,
};

use super::DeleteStocktakeError;

pub fn validate(
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

    if existing.is_locked {
        return Err(DeleteStocktakeError::StocktakeIsLocked);
    }

    if !check_stocktake_not_finalised(&existing.status) {
        return Err(DeleteStocktakeError::CannotEditFinalised);
    }
    Ok(())
}

impl From<RepositoryError> for DeleteStocktakeError {
    fn from(error: RepositoryError) -> Self {
        DeleteStocktakeError::DatabaseError(error)
    }
}
