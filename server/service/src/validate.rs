use repository::{RepositoryError, StorageConnection, StoreRowRepository};

use crate::current_store_id;

pub fn check_record_belongs_to_current_store(
    store_id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    Ok(store_id == &current_store_id(connection)?)
}

pub fn check_store_id_matches(store_id_a: &str, store_id_b: &str) -> bool {
    store_id_a == store_id_b
}

pub fn check_store_exists(
    connection: &StorageConnection,
    store_id: &str,
) -> Result<bool, RepositoryError> {
    Ok(StoreRowRepository::new(&connection)
        .find_one_by_id(store_id)?
        .is_some())
}
