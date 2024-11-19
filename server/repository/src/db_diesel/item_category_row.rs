use super::StorageConnection;
use crate::{repository_error::RepositoryError, Upsert};

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    item_category_join (id) {
        id -> Text,
        item_id -> Text,
        category_id -> Text,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default)]
#[diesel(table_name = item_category_join)]
pub struct ItemCategoryJoinRow {
    pub id: String,
    pub item_id: String,
    pub category_id: String,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct ItemCategoryJoinRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemCategoryJoinRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemCategoryJoinRowRepository { connection }
    }

    pub fn upsert_one(
        &self,
        item_category_join_row: &ItemCategoryJoinRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(item_category_join::table)
            .values(item_category_join_row)
            .on_conflict(item_category_join::id)
            .do_update()
            .set(item_category_join_row)
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        item_category_join_id: &str,
    ) -> Result<Option<ItemCategoryJoinRow>, RepositoryError> {
        let result = item_category_join::table
            .filter(item_category_join::id.eq(item_category_join_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, item_category_join_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            item_category_join::table.filter(item_category_join::id.eq(item_category_join_id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for ItemCategoryJoinRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ItemCategoryJoinRowRepository::new(con).upsert_one(self)?;
        // Not in changelog
        Ok(None)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ItemCategoryJoinRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
