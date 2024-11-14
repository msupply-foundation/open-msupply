use super::StorageConnection;
use crate::{repository_error::RepositoryError, Upsert};

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    item_category (id) {
        id -> Text,
        item_id -> Text,
        category_id -> Text,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default)]
#[diesel(table_name = item_category)]
pub struct ItemCategoryRow {
    pub id: String,
    pub item_id: String,
    pub category_id: String,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct ItemCategoryRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemCategoryRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemCategoryRowRepository { connection }
    }

    pub fn upsert_one(&self, item_category_row: &ItemCategoryRow) -> Result<(), RepositoryError> {
        diesel::insert_into(item_category::table)
            .values(item_category_row)
            .on_conflict(item_category::id)
            .do_update()
            .set(item_category_row)
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        item_category_id: &str,
    ) -> Result<Option<ItemCategoryRow>, RepositoryError> {
        let result = item_category::table
            .filter(item_category::id.eq(item_category_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, item_category_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(item_category::table.filter(item_category::id.eq(item_category_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for ItemCategoryRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ItemCategoryRowRepository::new(con).upsert_one(self)?;
        // Not in changelog
        Ok(None)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ItemCategoryRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
