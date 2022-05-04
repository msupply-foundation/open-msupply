use std::ops::Deref;

use super::{central_sync_buffer::central_sync_buffer::dsl::*, StorageConnection};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

table! {
    central_sync_buffer (id) {
        id -> Integer,
        table_name -> Text,
        record_id -> Text,
        data -> Text,
    }
}

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "central_sync_buffer"]
pub struct CentralSyncBufferRow {
    pub id: i32,
    pub table_name: String,
    pub record_id: String,
    pub data: String,
}

pub struct CentralSyncBufferRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CentralSyncBufferRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CentralSyncBufferRepository { connection }
    }

    pub async fn insert_one(
        &self,
        central_sync_buffer_row: &CentralSyncBufferRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(central_sync_buffer)
            .values(central_sync_buffer_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn insert_many(
        &self,
        central_sync_buffer_rows: &Vec<CentralSyncBufferRow>,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(central_sync_buffer)
            .values(central_sync_buffer_rows)
            // See https://github.com/diesel-rs/diesel/issues/1822.
            .execute(self.connection.connection.deref())?;
        Ok(())
    }

    pub async fn remove_all(&self) -> Result<(), RepositoryError> {
        diesel::delete(central_sync_buffer).execute(&self.connection.connection)?;
        Ok(())
    }

    // Retrieves all sync entries for a given table and returns them in asc order.
    pub async fn get_sync_entries(
        &self,
        table: &str,
    ) -> Result<Vec<CentralSyncBufferRow>, RepositoryError> {
        let result = central_sync_buffer
            .filter(table_name.eq(table))
            .order(id.asc())
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
