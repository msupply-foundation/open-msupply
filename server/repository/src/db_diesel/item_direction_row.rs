use super::item_direction_row::item_direction::dsl::*;
use super::item_link;
use super::item_row::item;
use crate::{
    diesel_macros::define_batch_table, ChangelogRepository, RepositoryError, RowActionType,
    SourceSiteId, StorageConnection,
};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

define_batch_table! {
    struct: ItemDirectionRow,
    repo: ItemDirectionRowRepository,
    table: item_direction (id) {
        id -> Text,
        item_link_id -> Text,
        directions -> Text,
        priority -> BigInt,
    }
}

#[derive(
    Clone, Default, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = item_direction)]
#[diesel(treat_none_as_null = true)]
pub struct ItemDirectionRow {
    pub id: String,
    pub item_link_id: String,
    pub directions: String,
    pub priority: i64,
}

joinable!(item_direction -> item_link (item_link_id));
allow_tables_to_appear_in_same_query!(item_direction, item);
allow_tables_to_appear_in_same_query!(item_direction, item_link);

pub struct ItemDirectionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemDirectionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemDirectionRowRepository { connection }
    }

    pub(crate) fn _upsert_one(&self, row: &ItemDirectionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(item_direction)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &ItemDirectionRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = ItemDirectionRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_all(&self) -> Result<Vec<ItemDirectionRow>, RepositoryError> {
        let result = item_direction.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        item_direction_id: &str,
    ) -> Result<Option<ItemDirectionRow>, RepositoryError> {
        let result = item_direction
            .filter(id.eq(item_direction_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<ItemDirectionRow>, RepositoryError> {
        Ok(item_direction
            .filter(id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }

    fn _delete(&self, item_direction_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(item_direction.filter(id.eq(item_direction_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn delete(&self, item_direction_id: &str) -> Result<(), RepositoryError> {
        self._delete(item_direction_id)?;
        let changelog = ItemDirectionRow::generate_changelog(
            item_direction_id.to_string(),
            self.connection,
            RowActionType::Delete,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub(crate) fn _batch_delete(&self, ids: &[&str]) -> Result<(), RepositoryError> {
        if ids.is_empty() {
            return Ok(());
        }
        diesel::delete(item_direction.filter(id.eq_any(ids)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}
