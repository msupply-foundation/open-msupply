use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::ChangeLogInsertRow;
use crate::ChangelogRepository;
use crate::ChangelogTableName;
use crate::RepositoryError;
use crate::RowActionType;
use crate::StorageConnection;
use crate::Upsert;

use super::property_row::property;

table! {
    property_table (id) {
        id -> Text,
        property_id -> Text,
        table_name -> Text,
    }
}
joinable!(property_table -> property (property_id));
allow_tables_to_appear_in_same_query!(property_table, property);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = property_table)]
pub struct PropertyTableRow {
    pub id: String,
    pub property_id: String,
    // Service-layer-validated parent table name (e.g. "item", "name").
    pub table_name: String,
}

pub struct PropertyTableRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyTableRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyTableRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &PropertyTableRow) -> Result<(), RepositoryError> {
        diesel::insert_into(property_table::table)
            .values(row)
            .on_conflict(property_table::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PropertyTableRow) -> Result<i64, RepositoryError> {
        self._upsert_one(row)?;
        self.insert_changelog(row.id.to_string(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        record_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::PropertyTable,
            record_id,
            row_action: action,
            store_id: None,
            name_id: None,
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all(&self) -> Result<Vec<PropertyTableRow>, RepositoryError> {
        Ok(property_table::table.load(self.connection.lock().connection())?)
    }

    pub fn find_by_property_id(
        &self,
        property_id: &str,
    ) -> Result<Vec<PropertyTableRow>, RepositoryError> {
        let result = property_table::table
            .filter(property_table::property_id.eq(property_id))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_by_table_name(
        &self,
        table_name: &str,
    ) -> Result<Vec<PropertyTableRow>, RepositoryError> {
        let result = property_table::table
            .filter(property_table::table_name.eq(table_name))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(property_table::table.filter(property_table::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for PropertyTableRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = PropertyTableRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    fn assert_upserted(&self, con: &StorageConnection) {
        let found = PropertyTableRowRepository::new(con).find_all().unwrap();
        assert!(found.iter().any(|r| r == self));
    }
}
