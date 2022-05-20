use super::{item_row::item::dsl::*, unit_row::unit, StorageConnection};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

table! {
    item (id) {
        id -> Text,
        name -> Text,
        code -> Text,
        unit_id -> Nullable<Text>,
        #[sql_name = "type"] type_ -> crate::db_diesel::item_row::ItemRowTypeMapping,
        // TODO, this is temporary, remove
        legacy_record -> Text,
    }
}

table! {
    item_is_visible (id) {
        id -> Text,
        is_visible -> Bool,
    }
}

joinable!(item -> unit (unit_id));
joinable!(item_is_visible -> item (id));

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ItemRowType {
    Stock,
    Service,
    NonStock,
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "item"]
pub struct ItemRow {
    pub id: String,
    pub name: String,
    pub code: String,
    pub unit_id: Option<String>,
    #[column_name = "type_"]
    pub r#type: ItemRowType,
    // TODO, this is temporary, remove
    pub legacy_record: String,
}

impl Default for ItemRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            name: Default::default(),
            code: Default::default(),
            unit_id: Default::default(),
            r#type: ItemRowType::Stock,
            legacy_record: Default::default(),
        }
    }
}

#[derive(Clone, Queryable, Debug, PartialEq, Eq, Default)]
pub struct ItemIsVisibleRow {
    pub id: String,
    pub is_visible: bool,
}

pub struct ItemRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, item_row: &ItemRow) -> Result<(), RepositoryError> {
        diesel::insert_into(item)
            .values(item_row)
            .on_conflict(id)
            .do_update()
            .set(item_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, item_row: &ItemRow) -> Result<(), RepositoryError> {
        diesel::replace_into(item)
            .values(item_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn insert_one(&self, item_row: &ItemRow) -> Result<(), RepositoryError> {
        diesel::insert_into(item)
            .values(item_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn find_all(&self) -> Result<Vec<ItemRow>, RepositoryError> {
        let result = item.load(&self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(&self, item_id: &str) -> Result<Option<ItemRow>, RepositoryError> {
        let result = item
            .filter(id.eq(item_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<ItemRow>, RepositoryError> {
        let result = item
            .filter(id.eq_any(ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}
