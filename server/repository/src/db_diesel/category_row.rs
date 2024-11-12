use crate::{
    repository_error::RepositoryError, ChangeLogInsertRow, ChangelogRepository, ChangelogTableName,
    RowActionType, StorageConnection, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    category (id) {
        id -> Text,
        name -> Text,
        description -> Nullable<Text>,
        parent_id -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default)]
#[diesel(table_name = category)]
pub struct CategoryRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct CategoryRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CategoryRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CategoryRowRepository { connection }
    }

    pub fn upsert_one(&self, category_row: &CategoryRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(category::table)
            .values(category_row)
            .on_conflict(category::id)
            .do_update()
            .set(category_row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(category_row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &CategoryRow,
        row_action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Category,
            record_id: row.id.clone(),
            row_action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        category_id: &str,
    ) -> Result<Option<CategoryRow>, RepositoryError> {
        let result = category::table
            .filter(category::id.eq(category_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, category_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(category::table.filter(category::id.eq(category_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for CategoryRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = CategoryRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            CategoryRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
