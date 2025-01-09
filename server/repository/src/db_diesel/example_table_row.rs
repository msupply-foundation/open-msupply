use super::{
    example_table_row::example_table::dsl as example_table_dsl, ChangeLogInsertRow, ChangelogRepository,
    ChangelogTableName, RowActionType, StorageConnection,
};

use crate::{repository_error::RepositoryError, Delete, Upsert};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
  example_table (id) {
      id -> Text,
      data -> Text
  }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset, Default, Serialize, Deserialize,
)]
#[diesel(table_name = example_table)]
pub struct ExampleTableRow {
    pub id: String,
    pub data: String,
}

pub struct ExampleTableRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ExampleTableRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ExampleTableRowRepository { connection }
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ExampleTableRow>, RepositoryError> {
        let result = example_table_dsl::example_table
            .filter(example_table_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn upsert_one(&self, row: &ExampleTableRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(example_table_dsl::example_table)
            .values(row)
            .on_conflict(example_table_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(&row.id, RowActionType::Upsert)
    }

    fn insert_changelog(&self, uid: &str, action: RowActionType) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::ExampleTable,
            record_id: uid.to_string(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(example_table_dsl::example_table.filter(example_table_dsl::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for ExampleTableRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log = ExampleTableRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            ExampleTableRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
// Most central data will be soft deleted (via upsert), and this trait will not be implemented
// add_example_table don't have referencial relations to any other tables so it's ok to delete as an example
pub struct ExampleTableRowDelete(pub String);
impl Delete for ExampleTableRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        ExampleTableRowRepository::new(con).delete(&self.0)?;
        Ok(None) // Table not in Changelog
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            ExampleTableRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
