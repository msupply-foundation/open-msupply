use super::StorageConnection;

use crate::{repository::RepositoryError, schema::StoreRow};

use diesel::prelude::*;

pub struct StoreRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StoreRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StoreRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &StoreRow) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::store::dsl::*;
        diesel::insert_into(store)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(feature = "sqlite")]
    pub fn upsert_one(&self, row: &StoreRow) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::store::dsl::*;
        diesel::replace_into(store)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn insert_one(&self, store_row: &StoreRow) -> Result<(), RepositoryError> {
        use crate::schema::diesel_schema::store::dsl::*;
        diesel::insert_into(store)
            .values(store_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, store_id: &str) -> Result<StoreRow, RepositoryError> {
        use crate::schema::diesel_schema::store::dsl::*;
        let result = store
            .filter(id.eq(store_id))
            .first(&self.connection.connection)?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<StoreRow>, RepositoryError> {
        use crate::schema::diesel_schema::store::dsl::*;
        let result = store
            .filter(id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn all(&self) -> Result<Vec<StoreRow>, RepositoryError> {
        use crate::schema::diesel_schema::store::dsl::*;
        let result = store.load(&self.connection.connection)?;
        Ok(result)
    }
}
