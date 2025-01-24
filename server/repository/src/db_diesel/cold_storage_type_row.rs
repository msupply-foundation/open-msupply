use super::StorageConnection;

use crate::{repository_error::RepositoryError, Upsert};

use diesel::prelude::*;

table! {
    cold_storage_type (id) {
        id -> Text,
        name -> Text,
        min_temperature -> Double,
        max_temperature -> Double,
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize,
)]
#[diesel(table_name = cold_storage_type)]
pub struct ColdStorageTypeRow {
    pub id: String,
    pub name: String,
    pub min_temperature: f64,
    pub max_temperature: f64,
}

pub struct ColdStorageTypeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ColdStorageTypeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ColdStorageTypeRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ColdStorageTypeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(cold_storage_type::table)
            .values(row)
            .on_conflict(cold_storage_type::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ColdStorageTypeRow>, RepositoryError> {
        let result = cold_storage_type::table
            .filter(cold_storage_type::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(cold_storage_type::table.filter(cold_storage_type::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for ColdStorageTypeRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ColdStorageTypeRowRepository::new(con).upsert_one(self)?;
        Ok(None)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ColdStorageTypeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
