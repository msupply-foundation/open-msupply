use super::{
    demographic_indicator_row::demographic_indicator::dsl as demographic_indicator_dsl,
    StorageConnection,
};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

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

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
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

    pub fn upsert_one(&self, row: &DemographicIndicatorRow) -> Result<(), RepositoryError> {
        diesel::insert_into(demographic_indicator_dsl::demographic_indicator)
            .values(row)
            .on_conflict(demographic_indicator_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
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
