use super::DBBackendConnection;

use crate::database::{
    repository::{repository::get_connection, RepositoryError},
    schema::StoreRow,
};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

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
        result.map_err(|err| RepositoryError::from(err))
    }
}
