use super::DBBackendConnection;

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::CentralSyncBufferRow,
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

pub struct CentralSyncBufferRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl CentralSyncBufferRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> CentralSyncBufferRepository {
        CentralSyncBufferRepository { pool }
    }

    pub async fn insert_many(
        &self,
        central_sync_buffer_rows: &Vec<CentralSyncBufferRow>,
    ) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::central_sync_buffer::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(central_sync_buffer)
            .values(central_sync_buffer_rows)
            .execute(&*connection)?;
        Ok(())
    }

    pub async fn pop_one(&self) -> Result<CentralSyncBufferRow, RepositoryError> {
        use crate::database::schema::diesel_schema::central_sync_buffer::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = central_sync_buffer
            .order(cursor_id.asc())
            .first(&connection)?;
        Ok(result)
    }

    pub async fn remove_all(&self) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::central_sync_buffer::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::delete(central_sync_buffer).execute(&connection)?;
        Ok(())
    }
}
