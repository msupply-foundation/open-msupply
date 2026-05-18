use chrono::NaiveDate;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::ChangeLogInsertRow;
use crate::ChangelogRepository;
use crate::ChangelogTableName;
use crate::RepositoryError;
use crate::RowActionType;
use crate::StorageConnection;
use crate::Upsert;

use super::property_option_row::property_option;
use super::property_row::property;

table! {
    property_value (id) {
        id -> Text,
        table_name -> Text,
        record_id -> Text,
        property_id -> Text,
        value_text -> Nullable<Text>,
        value_real -> Nullable<Double>,
        value_date -> Nullable<Date>,
        value_number -> Nullable<Integer>,
        value_option_id -> Nullable<Text>,
    }
}
joinable!(property_value -> property (property_id));
joinable!(property_value -> property_option (value_option_id));
allow_tables_to_appear_in_same_query!(property_value, property);
allow_tables_to_appear_in_same_query!(property_value, property_option);

#[derive(
    Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Serialize, Deserialize, Default,
)]
#[diesel(table_name = property_value)]
#[diesel(treat_none_as_null = true)]
pub struct PropertyValueRow {
    pub id: String,
    pub table_name: String,
    pub record_id: String,
    pub property_id: String,
    pub value_text: Option<String>,
    pub value_real: Option<f64>,
    pub value_date: Option<NaiveDate>,
    pub value_number: Option<i32>,
    pub value_option_id: Option<String>,
}

pub struct PropertyValueRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PropertyValueRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PropertyValueRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &PropertyValueRow) -> Result<(), RepositoryError> {
        diesel::insert_into(property_value::table)
            .values(row)
            .on_conflict(property_value::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &PropertyValueRow) -> Result<i64, RepositoryError> {
        self._upsert_one(row)?;
        self.insert_changelog(row.id.to_string(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        record_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::PropertyValue,
            record_id,
            row_action: action,
            store_id: None,
            name_id: None,
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    // Upsert keyed by the (table_name, record_id, property_id) triple — the
    // logical unique identity of a property value. Re-setting overwrites in place.
    pub fn upsert_by_record(&self, row: &PropertyValueRow) -> Result<i64, RepositoryError> {
        let existing = property_value::table
            .filter(property_value::table_name.eq(&row.table_name))
            .filter(property_value::record_id.eq(&row.record_id))
            .filter(property_value::property_id.eq(&row.property_id))
            .select(property_value::id)
            .first::<String>(self.connection.lock().connection())
            .optional()?;

        let to_insert = match existing {
            Some(existing_id) => PropertyValueRow {
                id: existing_id,
                ..row.clone()
            },
            None => row.clone(),
        };
        self.upsert_one(&to_insert)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<PropertyValueRow>, RepositoryError> {
        Ok(property_value::table
            .filter(property_value::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?)
    }

    pub fn find_by_record(
        &self,
        table_name: &str,
        record_id: &str,
    ) -> Result<Vec<PropertyValueRow>, RepositoryError> {
        Ok(property_value::table
            .filter(property_value::table_name.eq(table_name))
            .filter(property_value::record_id.eq(record_id))
            .load(self.connection.lock().connection())?)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(property_value::table.filter(property_value::id.eq(id)))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for PropertyValueRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = PropertyValueRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PropertyValueRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
