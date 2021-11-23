use super::StorageConnection;

use crate::{repository_error::RepositoryError, schema::CentralSyncCursorRow};

use diesel::prelude::*;

pub struct CentralSyncCursorRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CentralSyncCursorRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CentralSyncCursorRepository { connection }
    }

    pub async fn get_cursor(&self) -> Result<u32, RepositoryError> {
        use crate::schema::diesel_schema::central_sync_cursor::dsl::*;
        let result: CentralSyncCursorRow =
            central_sync_cursor.first(&self.connection.connection)?;
        let cursor = result.id as u32;
        Ok(cursor)
    }

    pub async fn update_cursor(&self, cursor: u32) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::central_sync_cursor::dsl::*;
        let row = CentralSyncCursorRow { id: cursor as i32 };
        // note: if already in a transaction this creates a safepoint:
        self.connection.connection.transaction(|| {
            diesel::delete(central_sync_cursor).execute(&self.connection.connection)?;
            diesel::insert_into(central_sync_cursor)
                .values(&row)
                .execute(&self.connection.connection)?;
            Ok(())
        })
    }
}
