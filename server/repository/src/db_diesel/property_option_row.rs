use chrono::NaiveDateTime;
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
    property_option (id) {
        id -> Text,
        property_id -> Text,
        name -> Text,
        translation_key -> Nullable<Text>,
        deleted_datetime -> Nullable<Timestamp>,
    }
}
joinable!(property_option -> property (property_id));
allow_tables_to_appear_in_same_query!(property_option, property);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Eq, Serialize, Deserialize, Default,
)]
#[diesel(table_name = property_option)]
#[diesel(treat_none_as_null = true)]
pub struct PropertyOptionRow {
    pub id: String,
    pub property_id: String,
    pub name: String,
    pub translation_key: Option<String>,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct PropertyOptionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyOptionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyOptionRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &PropertyOptionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(property_option::table)
            .values(row)
            .on_conflict(property_option::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PropertyOptionRow) -> Result<i64, RepositoryError> {
        self._upsert_one(row)?;
        self.insert_changelog(row.id.to_string(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        record_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::PropertyOption,
            record_id,
            row_action: action,
            store_id: None,
            name_id: None,
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        option_id: &str,
    ) -> Result<Option<PropertyOptionRow>, RepositoryError> {
        Ok(property_option::table
            .filter(property_option::id.eq(option_id))
            .first(self.connection.lock().connection())
            .optional()?)
    }

    pub fn find_by_property_id(
        &self,
        property_id: &str,
        include_deleted: bool,
    ) -> Result<Vec<PropertyOptionRow>, RepositoryError> {
        let mut query = property_option::table
            .filter(property_option::property_id.eq(property_id))
            .into_boxed();
        if !include_deleted {
            query = query.filter(property_option::deleted_datetime.is_null());
        }
        Ok(query.load(self.connection.lock().connection())?)
    }

    pub fn mark_deleted(
        &self,
        option_id: &str,
        deleted_at: NaiveDateTime,
    ) -> Result<(), RepositoryError> {
        diesel::update(property_option::table.filter(property_option::id.eq(option_id)))
            .set(property_option::deleted_datetime.eq(Some(deleted_at)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for PropertyOptionRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = PropertyOptionRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PropertyOptionRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
