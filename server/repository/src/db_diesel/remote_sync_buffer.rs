use std::ops::Deref;

use super::StorageConnection;

use crate::{
    repository_error::RepositoryError,
    schema::{
        diesel_schema::remote_sync_buffer::dsl as remote_sync_buffer_dsl, RemoteSyncBufferRow,
    },
};

use diesel::prelude::*;

pub struct RemoteSyncBufferRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RemoteSyncBufferRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RemoteSyncBufferRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_many(&self, rows: &Vec<RemoteSyncBufferRow>) -> Result<(), RepositoryError> {
        diesel::insert_into(remote_sync_buffer_dsl::remote_sync_buffer)
            .values(rows)
            .on_conflict(remote_sync_buffer_dsl::id)
            .do_update()
            .set(rows)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_many(&self, rows: &Vec<RemoteSyncBufferRow>) -> Result<(), RepositoryError> {
        diesel::replace_into(remote_sync_buffer_dsl::remote_sync_buffer)
            .values(rows)
            .execute(self.connection.connection.deref())?;
        Ok(())
    }

    pub async fn remove_all(&self) -> Result<(), RepositoryError> {
        diesel::delete(remote_sync_buffer_dsl::remote_sync_buffer)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    // Retrieves all sync entries for a given table and returns them in asc order.
    pub async fn get_sync_entries(
        &self,
        table: &str,
    ) -> Result<Vec<RemoteSyncBufferRow>, RepositoryError> {
        let result = remote_sync_buffer_dsl::remote_sync_buffer
            .filter(remote_sync_buffer_dsl::table_name.eq(table))
            .order(remote_sync_buffer_dsl::id.asc())
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
