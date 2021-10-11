use crate::database::repository::{RepositoryError, StorageConnection, StoreRepository};

pub mod insert;
pub use self::insert::*;

pub mod update;
pub use self::update::*;

pub fn current_store_id(connection: &StorageConnection) -> Result<String, RepositoryError> {
    // Need to check session for store
    Ok(StoreRepository::new(connection).all()?[0].id.clone())
}
