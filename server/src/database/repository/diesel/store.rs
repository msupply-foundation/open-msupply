use crate::database::repository::repository::get_connection;
use crate::database::repository::RepositoryError;
use crate::database::schema::StoreRow;

use diesel::prelude::*;
use diesel::r2d2::ConnectionManager;
use r2d2::Pool;

use super::DBBackendConnection;

#[derive(Clone)]
pub struct StoreRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl StoreRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> StoreRepository {
        StoreRepository { pool }
    }

    pub async fn insert_one(&self, store_row: &StoreRow) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::store::dsl::*;
        let connection = get_connection(&self.pool)?;
        diesel::insert_into(store)
            .values(store_row)
            .execute(&connection)?;
        Ok(())
    }

    pub async fn find_one_by_id(&self, store_id: &str) -> Result<StoreRow, RepositoryError> {
        use crate::database::schema::diesel_schema::store::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = store.filter(id.eq(store_id)).first(&connection);
        return result.map_err(|err| RepositoryError::from(err));
    }
}
