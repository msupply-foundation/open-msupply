use repository::{KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection};

pub enum CursorType {
    Standard(KeyType),
    Dynamic(String),
}

pub struct CursorController(CursorType);

impl CursorController {
    // This is original using standard cursor type defined as a key of KeyValueStoreRepository
    pub fn new(standard_cursor_type: KeyType) -> Self {
        Self(CursorType::Standard(standard_cursor_type))
    }

    // This was added when dynamic cursor type was added, it's either a concrete key of KeyValueStoreRepository
    // or a "Dynamic" key of KeyValueStoreRepository, in which case it's stored inside a JSON text of KeyValueStoreRepository
    pub fn from_cursor_type(cursor_type: CursorType) -> Self {
        Self(cursor_type)
    }

    pub fn get(&self, connection: &StorageConnection) -> Result<u64, RepositoryError> {
        match &self.0 {
            CursorType::Standard(key_type) => self.get_standard(connection, key_type),
            CursorType::Dynamic(cursor_id) => self.get_dynamic(connection, cursor_id),
        }
    }

    fn get_standard(
        &self,
        connection: &StorageConnection,
        key_type: &KeyType,
    ) -> Result<u64, RepositoryError> {
        let value = KeyValueStoreRepository::new(connection).get_i32(key_type.clone())?;
        let cursor = value.unwrap_or(0);
        Ok(cursor as u64)
    }

    pub fn update(
        &self,
        connection: &StorageConnection,
        cursor: u64,
    ) -> Result<(), RepositoryError> {
        // Transaction because in case of dynamic cursor we need to update on key of JSON text
        connection
            .transaction_sync(|connection| match &self.0 {
                CursorType::Standard(key_type) => {
                    self.update_standard(connection, key_type, cursor)
                }
                CursorType::Dynamic(cursor_id) => {
                    self.update_dynamic(connection, cursor_id, cursor)
                }
            })
            .map_err(|e| e.to_inner_error())?;

        Ok(())
    }

    fn update_standard(
        &self,
        connection: &StorageConnection,
        key_type: &KeyType,
        cursor: u64,
    ) -> Result<(), RepositoryError> {
        KeyValueStoreRepository::new(connection).set_i32(key_type.clone(), Some(cursor as i32))
    }

    fn get_dynamic_json(
        &self,
        connection: &StorageConnection,
    ) -> Result<serde_json::Value, RepositoryError> {
        let json_text = KeyValueStoreRepository::new(connection)
            .get_string(KeyType::DynamicCursor)?
            .unwrap_or_else(|| "{}".to_string());
        let json_value: serde_json::Value = serde_json::from_str(&json_text).unwrap_or_default();
        Ok(json_value)
    }

    fn update_dynamic(
        &self,
        connection: &StorageConnection,
        cursor_id: &str,
        cursor: u64,
    ) -> Result<(), RepositoryError> {
        let mut json_value = self.get_dynamic_json(connection)?;

        json_value[cursor_id] = serde_json::Value::from(cursor);
        let json_text = serde_json::to_string(&json_value).unwrap_or_default();

        KeyValueStoreRepository::new(connection)
            .set_string(KeyType::DynamicCursor, Some(json_text))?;
        Ok(())
    }

    fn get_dynamic(
        &self,
        connection: &StorageConnection,
        cursor_id: &str,
    ) -> Result<u64, RepositoryError> {
        let json_value = self.get_dynamic_json(connection)?;

        let cursor = json_value[cursor_id].as_u64().unwrap_or(0);
        Ok(cursor as u64)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use repository::test_db::{setup_test, SetupOption, SetupResult};

    // Test multiple dynamic cursors make sure one does not affect the other
    #[actix_rt::test]
    async fn dynamic_cursor_test() {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("dynamic_cursor_test"),
            ..Default::default()
        })
        .await;
        let controller =
            CursorController::from_cursor_type(CursorType::Dynamic("test_cursor".to_string()));
        // Initial value should be 0
        let result = controller.get(&connection);
        assert_eq!(result.unwrap(), 0);
        // Update the value
        controller.update(&connection, 123).unwrap();
        // Get the updated value
        let result = controller.get(&connection);
        assert_eq!(result.unwrap(), 123);
        // Update the value again
        controller.update(&connection, 456).unwrap();
        // Get the updated value
        let result = controller.get(&connection);
        assert_eq!(result.unwrap(), 456);
        // Test another cursor
        let controller2 =
            CursorController::from_cursor_type(CursorType::Dynamic("test_cursor2".to_string()));
        // Initial value should be 0
        let result = controller2.get(&connection);
        assert_eq!(result.unwrap(), 0);
        // Update the value
        controller2.update(&connection, 789).unwrap();
        // Get the updated value
        let result = controller2.get(&connection);
        assert_eq!(result.unwrap(), 789);
        // Get the first cursor value again
        let result = controller.get(&connection);
        assert_eq!(result.unwrap(), 456);
    }
}
