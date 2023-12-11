use super::{
    item_row::{item, ItemRow},
    StorageConnection,
};
use crate::repository_error::RepositoryError;

use self::item_link::dsl as item_link_dsl;
use diesel::prelude::*;

table! {
    item_link (id) {
        id -> Text,
        item_id -> Text,
    }
}

joinable!(item_link -> item (item_id));

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq)]
#[table_name = "item_link"]
pub struct ItemLinkRow {
    pub id: String,
    pub item_id: String,
}

impl Default for ItemLinkRow {
    fn default() -> Self {
        Self {
            id: Default::default(),
            item_id: Default::default(),
        }
    }
}

pub struct ItemLinkRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemLinkRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemLinkRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn insert_one_from_item(&self, item: &ItemRow) -> Result<(), RepositoryError> {
        let item_link_row = item_link_row_from_item_row(item);
        diesel::insert_into(item_link_dsl::item_link)
            .values(&item_link_row)
            .on_conflict(item_link::id)
            .do_nothing()
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn insert_one_from_item(&self, item: &ItemRow) -> Result<(), RepositoryError> {
        let item_link_row = item_link_row_from_item_row(item);
        diesel::insert_or_ignore_into(item_link_dsl::item_link)
            .values(&item_link_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, item_link_row: &ItemLinkRow) -> Result<(), RepositoryError> {
        diesel::insert_into(item_link_dsl::item_link)
            .values(item_link_row)
            .on_conflict(item_link::id)
            .do_update()
            .set(item_link_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, item_link_row: &ItemLinkRow) -> Result<(), RepositoryError> {
        diesel::replace_into(item_link_dsl::item_link)
            .values(item_link_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn insert_one(&self, item_link_row: &ItemLinkRow) -> Result<(), RepositoryError> {
        diesel::insert_into(item_link_dsl::item_link)
            .values(item_link_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub async fn find_all(&self) -> Result<Vec<ItemLinkRow>, RepositoryError> {
        let result = item_link_dsl::item_link.load(&self.connection.connection);
        Ok(result?)
    }

    pub fn find_one_by_id(
        &self,
        item_link_id: &str,
    ) -> Result<Option<ItemLinkRow>, RepositoryError> {
        let result = item_link_dsl::item_link
            .filter(item_link::id.eq(item_link_id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        item_link_ids: &[String],
    ) -> Result<Vec<ItemLinkRow>, RepositoryError> {
        let result = item_link_dsl::item_link
            .filter(item_link::id.eq_any(item_link_ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }

    pub fn delete(&self, item_link_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(item_link_dsl::item_link.filter(item_link::id.eq(item_link_id)))
            .execute(&self.connection.connection)?;
        Ok(())
    }
}

fn item_link_row_from_item_row(item: &ItemRow) -> ItemLinkRow {
    let item_link_row = ItemLinkRow {
        id: item.id.clone(),
        item_id: item.id.clone(),
    };
    item_link_row
}
