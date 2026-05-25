use super::{item_link_row::item_link, name_link_row::name_link, StorageConnection};

use crate::{repository_error::RepositoryError, Delete, Upsert};

use chrono::NaiveDate;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

// Default `store` mapping: everything except `logo`. Used by all joins and
// generic reads. The logo column is large (base64-encoded image) and is
// almost never needed alongside other store columns — fetch it via
// `store_logo_row` instead.
table! {
    store (id) {
        id -> Text,
        name_link_id -> Text,
        code -> Text,
        site_id -> Integer,
        store_mode -> crate::db_diesel::store_row::StoreModeMapping,
        created_date -> Nullable<Date>,
        is_disabled -> Bool,
    }
}

// Full row including `logo`. Only sync translation should reach for this —
// it's the path that legitimately needs to read/write the logo as part of a
// store row.
table! {
    #[sql_name = "store"]
    store_full_table (id) {
        id -> Text,
        name_link_id -> Text,
        code -> Text,
        site_id -> Integer,
        logo -> Nullable<Text>,
        store_mode -> crate::db_diesel::store_row::StoreModeMapping,
        created_date -> Nullable<Date>,
        is_disabled -> Bool,
    }
}

// Just `(id, logo)`. Fed to the GraphQL dataloader so `StoreNode.logo` can be
// resolved lazily on demand.
table! {
    #[sql_name = "store"]
    store_logo_row (id) {
        id -> Text,
        logo -> Nullable<Text>,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Hash, Default, Serialize, Deserialize, TS)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum StoreMode {
    #[default]
    Store,
    Dispensary,
}

joinable!(store -> name_link (name_link_id));
allow_tables_to_appear_in_same_query!(store, name_link);
allow_tables_to_appear_in_same_query!(store, item_link);

#[derive(
    Clone,
    Queryable,
    Insertable,
    Debug,
    PartialEq,
    Eq,
    AsChangeset,
    Default,
    Serialize,
    Deserialize,
    TS,
)]
#[diesel(table_name = store)]
pub struct StoreRow {
    pub id: String,
    pub name_link_id: String,
    pub code: String,
    pub site_id: i32,
    pub store_mode: StoreMode,
    pub created_date: Option<NaiveDate>,
    pub is_disabled: bool,
}

/// Full store row including the `logo` column. Sync translation only — every
/// other read/write should use `StoreRow` (which omits `logo`).
#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq, Default)]
#[diesel(table_name = store_full_table)]
pub struct StoreRowWithLogo {
    pub id: String,
    pub name_link_id: String,
    pub code: String,
    pub site_id: i32,
    pub logo: Option<String>,
    pub store_mode: StoreMode,
    pub created_date: Option<NaiveDate>,
    pub is_disabled: bool,
}

/// `(id, logo)` projection backing the GraphQL `StoreNode.logo` dataloader.
#[derive(Clone, Queryable, Debug, PartialEq, Eq, Default)]
#[diesel(table_name = store_logo_row)]
pub struct StoreLogoRow {
    pub id: String,
    pub logo: Option<String>,
}

pub struct StoreRowRepository<'a> {
    connection: &'a StorageConnection,
}

pub trait StoreRowRepositoryTrait<'a> {
    fn find_one_by_id(&self, store_id: &str) -> Result<Option<StoreRow>, RepositoryError>;
    // expose methods here as needed for test mocks
}

impl<'a> StoreRowRepositoryTrait<'a> for StoreRowRepository<'a> {
    fn find_one_by_id(&self, store_id: &str) -> Result<Option<StoreRow>, RepositoryError> {
        self.find_one_by_id(store_id)
    }
}

impl<'a> StoreRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StoreRowRepository { connection }
    }

    /// Upsert a lean store row. Does NOT touch the `logo` column — existing
    /// logo data in the DB is preserved across this call.
    pub fn upsert_one(&self, row: &StoreRow) -> Result<(), RepositoryError> {
        diesel::insert_into(store::table)
            .values(row)
            .on_conflict(store::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    /// Upsert a full store row including the logo column. Sync translation
    /// only — see the `StoreRowWithLogo` doc comment.
    pub fn upsert_one_with_logo(
        &self,
        row: &StoreRowWithLogo,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(store_full_table::table)
            .values(row)
            .on_conflict(store_full_table::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub async fn insert_one(&self, store_row: &StoreRow) -> Result<(), RepositoryError> {
        diesel::insert_into(store::table)
            .values(store_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(&self, store_id: &str) -> Result<Option<StoreRow>, RepositoryError> {
        let result = store::table
            .filter(store::id.eq(store_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn check_exists_by_id(&self, store_id: &str) -> Result<bool, RepositoryError> {
        let result: Option<String> = store::table
            .filter(store::id.eq(store_id))
            .select(store::id)
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result.is_some())
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<StoreRow>, RepositoryError> {
        let result = store::table
            .filter(store::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn all(&self) -> Result<Vec<StoreRow>, RepositoryError> {
        let result = store::table.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_logo_by_id(
        &self,
        store_id: &str,
    ) -> Result<Option<StoreLogoRow>, RepositoryError> {
        let result = store_logo_row::table
            .filter(store_logo_row::id.eq(store_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_logos_by_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<StoreLogoRow>, RepositoryError> {
        let result = store_logo_row::table
            .filter(store_logo_row::id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(store::table.filter(store::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct StoreRowDelete(pub String);
// TODO soft delete
impl Delete for StoreRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        StoreRowRepository::new(con).delete(&self.0)?;
        Ok(None) // Table not in Changelog
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            StoreRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

impl Upsert for StoreRowWithLogo {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        StoreRowRepository::new(con).upsert_one_with_logo(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        // assert_upserted compares using the lean StoreRow (logo is not
        // included in that shape) — checking logo round-trip belongs in
        // dedicated sync-translation tests.
        let lean = StoreRow {
            id: self.id.clone(),
            name_link_id: self.name_link_id.clone(),
            code: self.code.clone(),
            site_id: self.site_id,
            store_mode: self.store_mode.clone(),
            created_date: self.created_date,
            is_disabled: self.is_disabled,
        };
        assert_eq!(
            StoreRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(lean))
        )
    }
}

#[derive(Default)]
pub struct MockStoreRowRepository {
    pub find_one_by_id_result: Option<StoreRow>,
}
impl MockStoreRowRepository {
    pub fn boxed() -> Box<dyn StoreRowRepositoryTrait<'static>> {
        Box::new(MockStoreRowRepository::default())
    }
}

impl<'a> StoreRowRepositoryTrait<'a> for MockStoreRowRepository {
    fn find_one_by_id(&self, _row_id: &str) -> Result<Option<StoreRow>, RepositoryError> {
        Ok(self.find_one_by_id_result.clone())
    }
}
