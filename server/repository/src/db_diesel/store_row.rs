use super::{
    item_link_row::item_link, name_link_row::name_link, name_row::name,
    store_row::store::dsl as store_dsl, StorageConnection,
};

use crate::{repository_error::RepositoryError, Delete, Upsert};

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

table! {
    store (id) {
        id -> Text,
        name_id -> Text,
        code -> Text,
        site_id -> Integer,
        logo -> Nullable<Text>,
        store_mode -> crate::db_diesel::store_row::StoreModeMapping,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum StoreMode {
    Store,
    Dispensary,
}

joinable!(store -> name (name_id));
allow_tables_to_appear_in_same_query!(store, name_link);
allow_tables_to_appear_in_same_query!(store, item_link);

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq, AsChangeset, Default)]
#[table_name = "store"]
pub struct StoreRow {
    pub id: String,
    /// The store's name will never change, for this reason use the actual name_id instead of a
    /// name_link_id
    pub name_id: String,
    pub code: String,
    pub site_id: i32,
    pub logo: Option<String>,
    pub store_mode: StoreMode,
}

impl Default for StoreMode {
    fn default() -> Self {
        Self::Store
    }
}

pub struct StoreRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StoreRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StoreRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &StoreRow) -> Result<(), RepositoryError> {
        diesel::insert_into(store_dsl::store)
            .values(row)
            .on_conflict(store_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &StoreRow) -> Result<(), RepositoryError> {
        diesel::replace_into(store_dsl::store)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn insert_one(&self, store_row: &StoreRow) -> Result<(), RepositoryError> {
        diesel::insert_into(store_dsl::store)
            .values(store_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, store_id: &str) -> Result<Option<StoreRow>, RepositoryError> {
        let result = store_dsl::store
            .filter(store_dsl::id.eq(store_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_name_id(&self, name_id: &str) -> Result<Option<StoreRow>, RepositoryError> {
        let result = store_dsl::store
            .filter(store_dsl::name_id.eq(name_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<StoreRow>, RepositoryError> {
        let result = store_dsl::store
            .filter(store_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn all(&self) -> Result<Vec<StoreRow>, RepositoryError> {
        let result = store_dsl::store.load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(store_dsl::store.filter(store_dsl::id.eq(id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct StoreRowDelete(pub String);
// TODO soft delete
impl Delete for StoreRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        StoreRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            StoreRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for StoreRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        StoreRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            StoreRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
