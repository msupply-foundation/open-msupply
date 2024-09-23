use repository::{
    RepositoryError, StocktakeRow, StocktakeRowRepository, StocktakeStatus, StorageConnection,
};

pub fn check_stocktake_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StocktakeRow>, RepositoryError> {
    StocktakeRowRepository::new(connection).find_one_by_id(id)
}

pub fn check_stocktake_not_finalised(status: &StocktakeStatus) -> bool {
    *status != StocktakeStatus::Finalised
}
