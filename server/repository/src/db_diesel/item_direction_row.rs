use super::item_direction_row::item_direction::dsl::*;
use super::item_link;
use crate::Delete;
use crate::RepositoryError;
use crate::StorageConnection;
use crate::Upsert;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    item_direction (id) {
        id -> Text,
        item_link_id -> Text,
        directions -> Text,
        priority -> BigInt,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
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

pub struct ItemDirectionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemDirectionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemDirectionRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ItemDirectionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(item_direction)
            .values(row)
            .on_conflict(id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
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
        diesel::delete(item_direction.filter(id.eq(item_direction_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for ItemDirectionRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ItemDirectionRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ItemDirectionRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug)]
pub struct ItemDirectionRowDelete(pub String);
impl Delete for ItemDirectionRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ItemDirectionRowRepository::new(con).delete(&self.0)?;
        Ok(None)
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            ItemDirectionRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
