use repository::{RepositoryError, StorageConnection};

use crate::current_store_id;

pub fn check_record_belongs_to_current_store(
    store_id: &str,
    connection: &StorageConnection,
) -> Result<bool, RepositoryError> {
    Ok(store_id == &current_store_id(connection)?)
}
