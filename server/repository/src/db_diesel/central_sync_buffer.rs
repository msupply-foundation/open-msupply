use std::ops::Deref;

use super::{StorageConnection, TransactionError};

use crate::{
    db_diesel::CentralSyncCursorRepository, repository_error::RepositoryError,
    schema::CentralSyncBufferRow,
};

use diesel::prelude::*;

pub struct CentralSyncBufferRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CentralSyncBufferRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CentralSyncBufferRepository { connection }
    }

    pub async fn insert_one_and_update_cursor(
        &self,
        central_sync_buffer_row: &CentralSyncBufferRow,
    ) -> Result<(), RepositoryError> {
        let cursor = central_sync_buffer_row.id as u32;
        // note: if already in a transaction this creates a safepoint:
        let result: Result<(), TransactionError<RepositoryError>> = self
            .connection
            .transaction(|con| async move {
                CentralSyncBufferRepository::new(con)
                    .insert_one(central_sync_buffer_row)
                    .await?;
                CentralSyncCursorRepository::new(con)
                    .update_cursor(cursor)
                    .await?;
                Ok(())
            })
            .await;
        Ok(result?)
    }

    pub async fn insert_one(
        &self,
        central_sync_buffer_row: &CentralSyncBufferRow,
    ) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::central_sync_buffer::dsl::*;
        diesel::insert_into(central_sync_buffer)
            .values(central_sync_buffer_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn insert_many(
        &self,
        central_sync_buffer_rows: &Vec<CentralSyncBufferRow>,
    ) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::central_sync_buffer::dsl::*;
        diesel::insert_into(central_sync_buffer)
            .values(central_sync_buffer_rows)
            // See https://github.com/diesel-rs/diesel/issues/1822.
            .execute(self.connection.connection.deref())?;
        Ok(())
    }

    // TODO this looks buggy, you could lose the entry when the server crashes just after this call
    pub async fn pop_one(&self) -> Result<CentralSyncBufferRow, RepositoryError> {
        use crate::schema::diesel_schema::central_sync_buffer::dsl::*;
        let result: CentralSyncBufferRow = central_sync_buffer
            .order(id.asc())
            .first(&self.connection.connection)?;
        diesel::delete(central_sync_buffer.filter(id.eq(result.id)))
            .execute(&self.connection.connection)?;
        Ok(result)
    }

    pub async fn remove_all(&self) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::central_sync_buffer::dsl::*;
        diesel::delete(central_sync_buffer).execute(&self.connection.connection)?;
        Ok(())
    }

    // Retrieves all sync entries for a given table and returns them in asc order.
    pub async fn get_sync_entries(
        &self,
        table: &str,
    ) -> Result<Vec<CentralSyncBufferRow>, RepositoryError> {
        use crate::schema::diesel_schema::central_sync_buffer::dsl::*;
        let result = central_sync_buffer
            .filter(table_name.eq(table))
            .order(id.asc())
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
