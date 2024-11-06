use super::StorageConnection;

use crate::{repository_error::RepositoryError, Upsert};

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum IndicatorValueType {
    #[serde(rename = "string")]
    String,
    #[serde(rename = "number")]
    #[default]
    Number,
}

table! {
    indicator_line (id) {
        id -> Text,
        program_indicator_id -> Text,
        line_number -> Integer,
        description->Text,
        code -> Text,
        value_type -> Nullable<crate::IndicatorValueTypeMapping>,
        default_value -> Text,
        is_required -> Bool,
        is_active -> Bool,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default)]
#[diesel(table_name = indicator_line)]
pub struct IndicatorLineRow {
    pub id: String,
    pub program_indicator_id: String,
    pub line_number: i32,
    pub description: String,
    pub code: String,
    pub value_type: Option<IndicatorValueType>,
    pub default_value: String,
    pub is_required: bool,
    pub is_active: bool,
}

pub struct IndicatorLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> IndicatorLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        IndicatorLineRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &IndicatorLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(indicator_line::table)
            .values(row)
            .on_conflict(indicator_line::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        record_id: &str,
    ) -> Result<Option<IndicatorLineRow>, RepositoryError> {
        let result = indicator_line::table
            .filter(indicator_line::id.eq(record_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_indicator_id(
        &self,
        id: String,
    ) -> Result<Vec<IndicatorLineRow>, RepositoryError> {
        let result = indicator_line::table
            .filter(indicator_line::program_indicator_id.eq(id))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_many_by_indicator_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<IndicatorLineRow>, RepositoryError> {
        let result = indicator_line::table
            .filter(indicator_line::program_indicator_id.eq_any(ids))
            .load(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for IndicatorLineRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        IndicatorLineRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            IndicatorLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
