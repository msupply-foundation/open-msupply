use super::DBBackendConnection;

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::SyncBufferRow,
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

#[derive(Clone)]
pub struct SyncBufferRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl SyncBufferRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> SyncBufferRepository {
        SyncBufferRepository { pool }
    }

    pub async fn insert_one(&self, sync_buffer_row: &SyncBufferRow) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::sync_buffer::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(sync_buffer)
            .values(sync_buffer_row)
            .execute(&connection)?;
        Ok(())
    }

    pub async fn insert_many(
        &self,
        sync_buffer_rows: Vec<SyncBufferRow>,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::sync_buffer::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(sync_buffer)
            .values(sync_buffer_rows)
            .execute(&connection)
            .expect("");
        Ok(())
    }

    pub async fn find_all(&self) -> Result<Vec<SyncBufferRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::sync_buffer::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = sync_buffer.load(&connection)?;
        Ok(result)
    }
}
