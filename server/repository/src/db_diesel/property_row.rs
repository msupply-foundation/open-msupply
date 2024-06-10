use super::property_row::property::dsl::*;

use serde::{Deserialize, Serialize};

use crate::types::PropertyValueType;
use crate::ChangeLogInsertRow;
use crate::ChangelogRepository;
use crate::ChangelogTableName;
use crate::RepositoryError;
use crate::RowActionType;
use crate::StorageConnection;
use crate::Upsert;

use diesel::prelude::*;

table! {
    property (id) {
        id -> Text,
        key -> Text,
        name -> Text,
        value_type -> crate::db_diesel::assets::types::PropertyValueTypeMapping,
        allowed_values -> Nullable<Text>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize,
)]
#[diesel(table_name = property)]
#[diesel(treat_none_as_null = true)]
pub struct PropertyRow {
    pub id: String,
    pub key: String,
    pub name: String,
    pub value_type: PropertyValueType,
    pub allowed_values: Option<String>,
}

pub struct PropertyRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn _upsert_one(&self, property_row: &PropertyRow) -> Result<(), RepositoryError> {
        diesel::insert_into(property)
            .values(property_row)
            .on_conflict(id)
            .do_update()
            .set(property_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(&self, property_row: &PropertyRow) -> Result<(), RepositoryError> {
        diesel::replace_into(property)
            .values(property_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, property_row: &PropertyRow) -> Result<i64, RepositoryError> {
        self._upsert_one(property_row)?;
        self.insert_changelog(property_row.id.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        property_row: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Property,
            record_id: property_row,
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all(&self) -> Result<Vec<PropertyRow>, RepositoryError> {
        let result = property.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        property_id: &str,
    ) -> Result<Option<PropertyRow>, RepositoryError> {
        let result = property
            .filter(id.eq(property_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, property_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(property)
            .filter(id.eq(property_id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for PropertyRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        let _change_log_id = PropertyRowRepository::new(con).upsert_one(self)?;
        Ok(())
    }

    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = PropertyRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PropertyRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
