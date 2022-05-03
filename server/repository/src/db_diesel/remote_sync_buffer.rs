use super::{
    remote_sync_buffer::remote_sync_buffer::dsl as remote_sync_buffer_dsl, StorageConnection,
};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

use diesel_derive_enum::DbEnum;

table! {
    remote_sync_buffer (id) {
        id -> Text,
        table_name -> Text,
        record_id -> Text,
        action -> crate::db_diesel::remote_sync_buffer::RemoteSyncBufferActionMapping,
        data -> Text,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum RemoteSyncBufferAction {
    Create,
    Update,
    Delete,
    Merge,
}

#[derive(Clone, Queryable, AsChangeset, Insertable, Debug, PartialEq, Eq)]
#[table_name = "remote_sync_buffer"]
pub struct RemoteSyncBufferRow {
    /// the sync id
    pub id: String,
    pub table_name: String,
    pub record_id: String,
    pub action: RemoteSyncBufferAction,
    pub data: String,
}

pub struct RemoteSyncBufferRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> RemoteSyncBufferRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RemoteSyncBufferRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_many(&self, rows: &Vec<RemoteSyncBufferRow>) -> Result<(), RepositoryError> {
        for row in rows {
            diesel::insert_into(remote_sync_buffer_dsl::remote_sync_buffer)
                .values(row)
                .on_conflict(remote_sync_buffer_dsl::id)
                .do_update()
                .set(row)
                .execute(&self.connection.connection)?;
        }
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_many(&self, rows: &Vec<RemoteSyncBufferRow>) -> Result<(), RepositoryError> {
        use std::ops::Deref;
        diesel::replace_into(remote_sync_buffer_dsl::remote_sync_buffer)
            .values(rows)
            // See https://github.com/diesel-rs/diesel/issues/1822.
            .execute(self.connection.connection.deref())?;
        Ok(())
    }

    pub fn remove_all(&self) -> Result<(), RepositoryError> {
        diesel::delete(remote_sync_buffer_dsl::remote_sync_buffer)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    // Retrieves all sync entries for a given table and returns them in asc order.
    pub fn get_sync_entries(
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
