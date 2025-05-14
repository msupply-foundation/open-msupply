use diesel::prelude::*;

use super::StorageConnection;
use crate::repository_error::RepositoryError;

table! {
    dynamic_cursor (id) {
        id -> Text,
        cursor_value -> BigInt,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[diesel(table_name = dynamic_cursor)]
pub struct DynamicCursorRow {
    pub id: String,
    pub cursor_value: i64,
}

pub struct DynamicCursorRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DynamicCursorRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DynamicCursorRepository { connection }
    }

    pub fn get(&self, id: &str) -> Result<Option<u64>, RepositoryError> {
        let result = dynamic_cursor::table
            .filter(dynamic_cursor::id.eq(id))
            .select(dynamic_cursor::cursor_value)
            .first::<i64>(self.connection.lock().connection())
            .optional()?;

        Ok(result.map(|value| value as u64))
    }

    pub fn upsert(&self, id: &str, value: u64) -> Result<(), RepositoryError> {
        diesel::insert_into(dynamic_cursor::table)
            .values(DynamicCursorRow {
                id: id.to_string(),
                cursor_value: value as i64,
            })
            .on_conflict(dynamic_cursor::id)
            .do_update()
            .set(dynamic_cursor::cursor_value.eq(value as i64))
            .execute(self.connection.lock().connection())?;

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn dynamic_cursor_crud() {
        let (_, connection, _, _) = setup_all("dynamic_cursor_crud", MockDataInserts::none()).await;

        let repo = DynamicCursorRepository::new(&connection);

        // Initial value should be None
        let result = repo.get("test_cursor");
        assert_eq!(result.unwrap(), None);

        // Set a value
        repo.upsert("test_cursor", 123).unwrap();

        // Get the updated value
        let result = repo.get("test_cursor");
        assert_eq!(result.unwrap(), Some(123));

        // Update the value
        repo.upsert("test_cursor", 456).unwrap();

        // Get the updated value
        let result = repo.get("test_cursor");
        assert_eq!(result.unwrap(), Some(456));
    }
}
