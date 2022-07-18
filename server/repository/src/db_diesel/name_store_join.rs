use super::{
    name_row::name, name_store_join::name_store_join::dsl as name_store_join_dsl, store_row::store,
    StorageConnection,
};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

table! {
    name_store_join (id) {
        id -> Text,
        name_id -> Text,
        store_id -> Text,
        name_is_customer -> Bool,
        name_is_supplier -> Bool,
    }
}

#[derive(Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Clone, Default)]
#[table_name = "name_store_join"]
pub struct NameStoreJoinRow {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub name_is_customer: bool,
    pub name_is_supplier: bool,
}

joinable!(name_store_join -> store (store_id));
joinable!(name_store_join -> name (name_id));

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
            .on_conflict(name_store_join_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &NameStoreJoinRow) -> Result<(), RepositoryError> {
        diesel::replace_into(name_store_join_dsl::name_store_join)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<NameStoreJoinRow>, RepositoryError> {
        let result = name_store_join_dsl::name_store_join
            .filter(name_store_join_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(name_store_join_dsl::name_store_join.filter(name_store_join_dsl::id.eq(id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}
