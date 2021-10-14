use crate::{
    database::{
        repository::{RepositoryError, StockLineRepository, StorageConnection},
        schema::StockLineRow,
    },
    service::WithDBError,
};

pub struct StockLineNotFound;

pub fn check_batch_exists(
    batch_id: &str,
    connection: &StorageConnection,
) -> Result<StockLineRow, WithDBError<StockLineNotFound>> {
    let batch_result = StockLineRepository::new(connection).find_one_by_id(batch_id);

    match batch_result {
        Ok(batch) => Ok(batch),
        Err(RepositoryError::NotFound) => Err(WithDBError::err(StockLineNotFound)),
        Err(error) => Err(WithDBError::db(error)),
    }
}
