use super::{
    // temperature_range_row::temperature_range,
    temperature_range_row::temperature_range::dsl as temperature_range_dsl,
    StorageConnection,
};
use crate::{repository_error::RepositoryError, Upsert};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use diesel::prelude::*;

table! {
    temperature_range (id) {
        id -> Text,
        name -> Text,
        min_temperature -> Double,
        max_temperature -> Double,
    }
}

// joinable!(location_movement -> store (store_id));
// joinable!(location_movement -> stock_line (stock_line_id));
// joinable!(location_movement -> location (location_id));

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize,
)]
#[diesel(table_name = temperature_range)]
pub struct TemperatureRangeRow {
    pub id: String,
    pub name: String,
    pub min_temperature: f64,
    pub max_temperature: f64,
}

pub struct TemperatureRangeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> TemperatureRangeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureRangeRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &TemperatureRangeRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(temperature_range_dsl::temperature_range)
            .values(row)
            .on_conflict(temperature_range_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &TemperatureRangeRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::TemperatureRange,
            record_id: row.id.clone(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<TemperatureRangeRow>, RepositoryError> {
        let result = temperature_range_dsl::temperature_range
            .filter(temperature_range_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(
            temperature_range_dsl::temperature_range.filter(temperature_range_dsl::id.eq(id)),
        )
        .execute(self.connection.lock().connection())?;
        Ok(())
    }
}

impl Upsert for TemperatureRangeRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = TemperatureRangeRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            TemperatureRangeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
