use repository::{
    RepositoryError, StocktakeRow, StocktakeRowRepository, StocktakeStatus, StorageConnection,
};

pub fn check_stocktake_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StocktakeRow>, RepositoryError> {
    StocktakeRowRepository::new(connection).find_one_by_id(id)
}

/// Like `check_stocktake_exist`, but takes a row-level lock on the stocktake row so that
/// concurrent transactions editing/finalising the same stocktake are serialised. Must be called
/// inside a transaction (see `find_one_by_id_for_update`).
pub fn check_stocktake_exist_for_update(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StocktakeRow>, RepositoryError> {
    StocktakeRowRepository::new(connection).find_one_by_id_for_update(id)
}

pub fn check_stocktake_not_finalised(status: &StocktakeStatus) -> bool {
    *status != StocktakeStatus::Finalised
}
