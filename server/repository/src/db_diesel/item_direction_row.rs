use super::item_direction_row::item_direction::dsl::*;
use super::item_row::item;
use crate::diesel_macros::define_linked_tables;
use crate::Delete;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

define_linked_tables! {
    view: item_direction = "item_direction_view",
    core: item_direction_with_links = "item_direction",
    struct: ItemDirectionRow,
    repo: ItemDirectionRowRepository,
    shared: {
        directions -> Text,
        priority -> BigInt,
    },
    links: {
        item_link_id -> item_id,
    },
    optional_links: {
    }
}

joinable!(item_direction -> item (item_id));
allow_tables_to_appear_in_same_query!(item_direction, item);

#[derive(
    Clone, Default, Queryable, Debug, PartialEq, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = item_direction)]
pub struct ItemDirectionRow {
    pub id: String,
    pub directions: String,
    pub priority: i64,
    // Resolved from item_link - must be last to match view column order
    pub item_id: String,
}

pub struct ItemDirectionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemDirectionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemDirectionRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ItemDirectionRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        Ok(())
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

    pub fn delete(&self, item_direction_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            item_direction_with_links::table
                .filter(item_direction_with_links::id.eq(item_direction_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for ItemDirectionRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ItemDirectionRowRepository::new(con).upsert_one(self)?;
        Ok(None)
    }

    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ItemDirectionRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct ItemDirectionRowDelete(pub String);
impl Delete for ItemDirectionRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ItemDirectionRowRepository::new(con).delete(&self.0)?;
        Ok(None)
    }

    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            ItemDirectionRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
