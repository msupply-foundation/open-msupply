use crate::{
    repository_error::RepositoryError, ChangeLogInsertRow, ChangelogRepository, ChangelogTableName,
    RowActionType, StorageConnection, Upsert,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    category_group (id) {
        id -> Text,
        name -> Text,
        root_id -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Default)]
#[diesel(table_name = category_group)]
pub struct CategoryGroupRow {
    pub id: String,
    pub name: String,
    pub root_id: Option<String>,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct CategoryGroupRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> CategoryGroupRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        CategoryGroupRowRepository { connection }
    }

    pub fn upsert_one(
        &self,
        category_group_row: &CategoryGroupRow,
    ) -> Result<i64, RepositoryError> {
        diesel::insert_into(category_group::table)
            .values(category_group_row)
            .on_conflict(category_group::id)
            .do_update()
            .set(category_group_row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(category_group_row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &CategoryGroupRow,
        row_action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::CategoryGroup,
            record_id: row.id.clone(),
            row_action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        category_group_id: &str,
    ) -> Result<Option<CategoryGroupRow>, RepositoryError> {
        let result = category_group::table
            .filter(category_group::id.eq(category_group_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, category_group_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(category_group::table.filter(category_group::id.eq(category_group_id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for CategoryGroupRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = CategoryGroupRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            CategoryGroupRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
