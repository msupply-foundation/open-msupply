use super::{DBBackendConnection, DBConnection};

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

    #[cfg(feature = "postgres")]
    pub fn upsert_one_tx(connection: &DBConnection, row: &StoreRow) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::store::dsl::*;
        diesel::insert_into(store)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(connection)?;
        Ok(())
    }

    #[cfg(feature = "sqlite")]
    pub fn upsert_one_tx(connection: &DBConnection, row: &StoreRow) -> Result<(), RepositoryError> {
        use crate::database::schema::diesel_schema::store::dsl::*;
        diesel::replace_into(store)
            .values(row)
            .execute(connection)?;
        Ok(())
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
        let result = store.filter(id.eq(store_id)).first(&connection)?;
        Ok(result)
    }

    pub async fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<StoreRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::store::dsl::*;
        let connection = get_connection(&self.pool)?;
        let result = store.filter(id.eq_any(ids)).load(&connection)?;
        Ok(result)
    }
}
