use crate::{Delete, Upsert};

use super::{
    item_link_row::item_link, item_row::item::dsl::*, name_link_row::name_link, unit_row::unit,
    ItemLinkRow, ItemLinkRowRepository, RepositoryError, StorageConnection,
};

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;

table! {
    item (id) {
        id -> Text,
        name -> Text,
        code -> Text,
        unit_id -> Nullable<Text>,
        default_pack_size -> Integer,
        #[sql_name = "type"] type_ -> crate::db_diesel::item_row::ItemRowTypeMapping,
        // TODO, this is temporary, remove
        legacy_record -> Text,
        is_active -> Bool,
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
allow_tables_to_appear_in_same_query!(item, item_link);
allow_tables_to_appear_in_same_query!(item, name_link);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum ItemRowType {
    Stock,
    Service,
    NonStock,
}

#[derive(
    Clone,
    Insertable,
    Queryable,
    Debug,
    PartialEq,
    AsChangeset,
    Eq,
    serde::Serialize,
    serde::Deserialize,
)]
#[table_name = "item"]
pub struct ItemRow {
    pub id: String,
    pub name: String,
    pub code: String,
    pub unit_id: Option<String>,
    pub default_pack_size: i32,
    #[column_name = "type_"]
    pub r#type: ItemRowType,
    // TODO, this is temporary, remove
    pub legacy_record: String,
    pub is_active: bool,
}

impl Default for ItemRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            name: Default::default(),
            code: Default::default(),
            unit_id: Default::default(),
            default_pack_size: Default::default(),
            r#type: ItemRowType::Stock,
            legacy_record: Default::default(),
            is_active: true,
        }
    }
}

pub struct ItemRowRepository<'a> {
    connection: &'a StorageConnection,
}

fn insert_or_ignore_item_link(
    connection: &StorageConnection,
    item_row: &ItemRow,
) -> Result<(), RepositoryError> {
    let item_link_row = ItemLinkRow {
        id: item_row.id.clone(),
        item_id: item_row.id.clone(),
    };
    ItemLinkRowRepository::new(connection).insert_one_or_ignore(&item_link_row)?;
    Ok(())
}

impl<'a> ItemRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    fn _upsert_one(&self, item_row: &ItemRow) -> Result<(), RepositoryError> {
        diesel::insert_into(item)
            .values(item_row)
            .on_conflict(id)
            .do_update()
            .set(item_row)
            .execute(&self.connection.connection)?;

        insert_or_ignore_item_link(&self.connection, item_row)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn _upsert_one(&self, item_row: &ItemRow) -> Result<(), RepositoryError> {
        diesel::replace_into(item)
            .values(item_row)
            .execute(&self.connection.connection)?;

        insert_or_ignore_item_link(self.connection, item_row)?;
        Ok(())
    }

    pub async fn insert_one(&self, item_row: &ItemRow) -> Result<(), RepositoryError> {
        diesel::insert_into(item)
            .values(item_row)
            .execute(&self.connection.connection)?;

        insert_or_ignore_item_link(self.connection, item_row)?;
        Ok(())
    }

    pub async fn find_all(&self) -> Result<Vec<ItemRow>, RepositoryError> {
        let result = item.load(&self.connection.connection);
        Ok(result?)
    }

    pub fn find_active_by_id(&self, item_id: &str) -> Result<Option<ItemRow>, RepositoryError> {
        let result = self
            .find_one_by_id(item_id)?
            .and_then(|r| r.is_active.then_some(r));
        Ok(result)
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

    pub fn delete(&self, item_id: &str) -> Result<(), RepositoryError> {
        diesel::update(item.filter(id.eq(item_id)))
            .set(is_active.eq(false))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct ItemRowDelete(pub String);
impl Delete for ItemRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        ItemRowRepository::new(con).delete(&self.0)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert!(matches!(
            ItemRowRepository::new(con).find_one_by_id(&self.0),
            Ok(Some(ItemRow {
                is_active: false,
                ..
            })) | Ok(None)
        ));
    }
}

crate::create_upsert_trait!(ItemRow, ItemRowRepository, crate::ChangelogTableName::Item);
