use repository::{RepositoryError, StorageConnection, StoreRepository};

use crate::current_store_id;

pub fn check_record_belongs_to_current_store(
    store_id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    Ok(store_id == &current_store_id(connection)?)
}

pub fn check_store_exists(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<bool, RepositoryError> {
    Ok(StoreRepository::new(&connection)
        .find_one_by_id(store_id)?
        .is_some())
}
