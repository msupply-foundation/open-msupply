use repository::{KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection};

pub struct CursorController(KeyType);

impl CursorController {
    pub fn new(cursor_type: KeyType) -> Self {
        Self(cursor_type)
    }

    pub fn get(&self, connection: &StorageConnection) -> Result<u64, RepositoryError> {
        let value = KeyValueStoreRepository::new(connection).get_i32(self.0.clone())?;
        let cursor = value.unwrap_or(0);
        Ok(cursor as u64)
    }

    pub fn update(
        &self,
        connection: &StorageConnection,
        cursor: u64,
    ) -> Result<(), RepositoryError> {
        KeyValueStoreRepository::new(connection).set_i32(self.0.clone(), Some(cursor as i32))
    }
}
