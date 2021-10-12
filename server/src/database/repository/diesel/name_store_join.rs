use super::StorageConnection;

use crate::database::{
    repository::RepositoryError,
    schema::diesel_schema::name_store_join::dsl as name_store_join_dsl, schema::NameStoreJoinRow,
};

use diesel::prelude::*;

pub struct NameStoreJoinRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NameStoreJoinRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NameStoreJoinRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_store_join_dsl::name_store_join)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(feature = "sqlite")]
    pub fn upsert_one(&self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::replace_into(name_store_join_dsl::name_store_join)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
