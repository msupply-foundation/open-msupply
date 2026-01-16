use super::{item_link_row::item_link, name_link_row::name_link, StorageConnection};

use crate::{repository_error::RepositoryError, syncv7::*, Delete, Upsert};

use chrono::NaiveDate;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

table! {
    store (id) {
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
    pub logo: Option<String>,
    pub store_mode: StoreMode,
    pub created_date: Option<NaiveDate>,
    pub is_disabled: bool,
}

crate::impl_record! {
    struct: StoreRow,
    table: store,
    id_field: id
}

crate::impl_central_sync_record!(StoreRow, crate::ChangelogTableName::Store);

pub(crate) struct Translator;

impl TranslatorTrait for Translator {
    type Item = StoreRow;
}

impl Translator {
    // Needs to be added to translators() in ..
    #[deny(dead_code)]
    pub(crate) fn boxed() -> Box<dyn BoxableSyncRecord> {
        Box::new(Self)
    }
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

    pub fn upsert_one(&self, row: &StoreRow) -> Result<(), RepositoryError> {
        row.upsert_internal(&self.connection)
    }

    pub fn find_one_by_id(&self, store_id: &str) -> Result<Option<StoreRow>, RepositoryError> {
        StoreRow::find_by_id(self.connection, store_id)
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

impl Upsert for StoreRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        StoreRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            StoreRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
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
