use super::{
    demographic_indicator_row::demographic_indicator::dsl as demographic_indicator_dsl,
    StorageConnection,
};

use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    Upsert,
};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    demographic_indicator(id) {
        id -> Text,
        name -> Text,
        base_year -> Integer,
        base_population -> Integer,
        population_percentage -> Double,
        year_1_projection -> Integer,
        year_2_projection -> Integer,
        year_3_projection -> Integer,
        year_4_projection -> Integer,
        year_5_projection -> Integer,
    }
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize, Deserialize,
)]
#[diesel(table_name = demographic_indicator)]
pub struct DemographicIndicatorRow {
    pub id: String,
    pub name: String,
    pub base_year: i32,
    pub base_population: i32,
    pub population_percentage: f64,
    pub year_1_projection: i32,
    pub year_2_projection: i32,
    pub year_3_projection: i32,
    pub year_4_projection: i32,
    pub year_5_projection: i32,
}

pub struct DemographicIndicatorRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DemographicIndicatorRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DemographicIndicatorRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &DemographicIndicatorRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(demographic_indicator_dsl::demographic_indicator)
            .values(row)
            .on_conflict(demographic_indicator_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(row.id.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row_id: String,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::DemographicIndicator,
            record_id: row_id,
            row_action: action,
            store_id: None,
            ..Default::default()
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        demographic_indicator_id: &str,
    ) -> Result<Option<DemographicIndicatorRow>, RepositoryError> {
        let result = demographic_indicator_dsl::demographic_indicator
            .filter(demographic_indicator_dsl::id.eq(demographic_indicator_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}

impl Upsert for DemographicIndicatorRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let cursor_id = DemographicIndicatorRowRepository::new(con).upsert_one(self)?;
        Ok(Some(cursor_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            DemographicIndicatorRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
