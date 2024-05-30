use super::{name_property_row::name_property::dsl::*, property_row::property};

use serde::{Deserialize, Serialize};

use crate::ChangeLogInsertRow;
use crate::ChangelogRepository;
use crate::ChangelogTableName;
use crate::RepositoryError;
use crate::RowActionType;
use crate::StorageConnection;
use crate::Upsert;

use diesel::prelude::*;

table! {
    name_property (id) {
        id -> Text,
        property_id -> Text,
    }
}
joinable!(name_property -> property (property_id));
// TODO: I shouldn't need this??
allow_tables_to_appear_in_same_query!(name_property, property);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = name_property)]
#[diesel(treat_none_as_null = true)]
pub struct NamePropertyRow {
    pub id: String,
    pub property_id: String,
}

pub struct NamePropertyRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NamePropertyRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NamePropertyRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn _upsert_one(&self, name_property_row: &NamePropertyRow) -> Result<(), RepositoryError> {
        diesel::insert_into(name_property)
            .values(name_property_row)
            .on_conflict(id)
            .do_update()
            .set(name_property_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(&self, name_property_row: &NamePropertyRow) -> Result<(), RepositoryError> {
        diesel::replace_into(name_property)
            .values(name_property_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, name_property_row: &NamePropertyRow) -> Result<i64, RepositoryError> {
        self._upsert_one(name_property_row)?;
        self.insert_changelog(name_property_row.id.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        name_property_row: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::NameProperty,
            record_id: name_property_row,
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all(&self) -> Result<Vec<NamePropertyRow>, RepositoryError> {
        let result = name_property.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        name_property_id: &str,
    ) -> Result<Option<NamePropertyRow>, RepositoryError> {
        let result = name_property
            .filter(id.eq(name_property_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, name_property_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(name_property)
            .filter(id.eq(name_property_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for NamePropertyRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        let _change_log_id = NamePropertyRowRepository::new(con).upsert_one(self)?;
        Ok(())
    }

    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = NamePropertyRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            NamePropertyRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
