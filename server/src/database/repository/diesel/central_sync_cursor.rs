use super::{get_connection, DBBackendConnection, DBConnection};

use crate::database::{repository::RepositoryError, schema::CentralSyncCursorRow};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

pub struct CentralSyncCursorRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl CentralSyncCursorRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> CentralSyncCursorRepository {
        CentralSyncCursorRepository { pool }
    }

    pub async fn get_cursor(&self) -> Result<u32, RepositoryError> {
        use crate::database::schema::diesel_schema::central_sync_cursor::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result: CentralSyncCursorRow = central_sync_cursor.first(&connection)?;
        let cursor = result.id as u32;
        Ok(cursor)
    }

    pub async fn update_cursor(&self, cursor: u32) -> Result<(), RepositoryError> {
        let connection = get_connection(&self.pool)?;
        CentralSyncCursorRepository::update_cursor_tx(&connection, cursor)
    }

    pub fn update_cursor_tx(connection: &DBConnection, cursor: u32) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::central_sync_cursor::dsl::*;
        let row = CentralSyncCursorRow { id: cursor as i32 };
        diesel::delete(central_sync_cursor).execute(connection)?;
        diesel::insert_into(central_sync_cursor)
            .values(&row)
            .execute(connection)?;
        Ok(())
    }
}
