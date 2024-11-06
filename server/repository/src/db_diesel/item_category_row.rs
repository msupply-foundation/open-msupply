use super::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType, StorageConnection,
};
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

    pub fn upsert_one(&self, item_category_row: &ItemCategoryRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(item_category::table)
            .values(item_category_row)
            .on_conflict(item_category::id)
            .do_update()
            .set(item_category_row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(item_category_row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &ItemCategoryRow,
        row_action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::ItemCategory,
            record_id: row.id.clone(),
            row_action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
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
        let change_log_id = ItemCategoryRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ItemCategoryRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
