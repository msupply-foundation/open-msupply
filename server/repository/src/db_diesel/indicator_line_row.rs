use super::StorageConnection;

use crate::{repository_error::RepositoryError, Upsert};

use diesel::prelude::*;

table! {
    indicator_line (id) {
        id -> Text,
        program_indicator_id -> Text,
        index -> BigInt,
        description->Text,
        code -> Text,
        value_type -> Text,
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
    pub index: i64,
    pub description: String,
    pub code: String,
    pub value_type: String,
    pub default_value: String,
    pub is_required: bool,
    pub is_active: bool,
}

pub struct IndicatorRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> IndicatorRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        IndicatorRowRepository { connection }
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
}

impl Upsert for IndicatorLineRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        IndicatorRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            IndicatorRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
