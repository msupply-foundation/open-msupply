use repository::{DynamicCursorRepository, RepositoryError, StorageConnection};

pub struct DynamicCursorController;

impl DynamicCursorController {
    pub fn new() -> Self {
        Self
    }

    pub fn get(
        &self,
        connection: &StorageConnection,
        cursor_id: &str,
    ) -> Result<u64, RepositoryError> {
        let value = DynamicCursorRepository::new(connection).get(cursor_id)?;
        let cursor = value.unwrap_or(0);
        Ok(cursor)
    }

    pub fn update(
        &self,
        connection: &StorageConnection,
        cursor_id: &str,
        cursor: u64,
    ) -> Result<(), RepositoryError> {
        DynamicCursorRepository::new(connection).upsert(cursor_id, cursor)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use repository::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn dynamic_cursor_controller_test() {
        let (_, connection, _, _) =
            setup_all("dynamic_cursor_controller", MockDataInserts::none()).await;

        let controller = DynamicCursorController::new();

        // Initial value should be 0
        let result = controller.get(&connection, "test_cursor");
        assert_eq!(result.unwrap(), 0);

        // Update the value
        controller.update(&connection, "test_cursor", 123).unwrap();

        // Get the updated value
        let result = controller.get(&connection, "test_cursor");
        assert_eq!(result.unwrap(), 123);
    }
}
