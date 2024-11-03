use super::{IndicatorValueType, StorageConnection};

use crate::{repository_error::RepositoryError, Upsert};

use diesel::prelude::*;

table! {
    indicator_column (id) {
        id -> Text,
        program_indicator_id -> Text,
        column_number -> BigInt,
        header ->Text,
        value_type -> Nullable<crate::IndicatorValueTypeMapping>,
        default_value -> Text,
        is_active -> Bool,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, AsChangeset, Default)]
#[diesel(table_name = indicator_column)]
pub struct IndicatorColumnRow {
    pub id: String,
    pub program_indicator_id: String,
    pub column_number: i64,
    pub header: String,
    pub value_type: Option<IndicatorValueType>,
    pub default_value: String,
    pub is_active: bool,
}

pub struct IndicatorColumnRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> IndicatorColumnRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        IndicatorColumnRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &IndicatorColumnRow) -> Result<(), RepositoryError> {
        let query = diesel::insert_into(indicator_column::table)
            .values(row)
            .on_conflict(indicator_column::id)
            .do_update()
            .set(row);

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        query.execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        record_id: &str,
    ) -> Result<Option<IndicatorColumnRow>, RepositoryError> {
        let result = indicator_column::table
            .filter(indicator_column::id.eq(record_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}

impl Upsert for IndicatorColumnRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        IndicatorColumnRowRepository::new(con).upsert_one(self)?;
        Ok(None) // Table not in Changelog
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            IndicatorColumnRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
