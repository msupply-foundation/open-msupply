use super::{
    demographic_projection_row::demographic_projection::dsl as demographic_projection_dsl,
    StorageConnection,
};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;
use serde::Serialize;

table! {
    demographic_projection(id) {
        id -> Text,
        base_year -> Integer,
        year_1 -> Double,
        year_2 -> Double,
        year_3 -> Double,
        year_4 -> Double,
        year_5 -> Double,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, Serialize)]
#[diesel(table_name = demographic_projection)]
pub struct DemographicProjectionRow {
    pub id: String,
    pub base_year: i32,
    pub year_1: f64,
    pub year_2: f64,
    pub year_3: f64,
    pub year_4: f64,
    pub year_5: f64,
}

pub struct DemographicProjectionRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DemographicProjectionRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DemographicProjectionRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &DemographicProjectionRow) -> Result<(), RepositoryError> {
        diesel::insert_into(demographic_projection_dsl::demographic_projection)
            .values(row)
            .on_conflict(demographic_projection::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        demographic_projection_id: &str,
    ) -> Result<Option<DemographicProjectionRow>, RepositoryError> {
        let result = demographic_projection_dsl::demographic_projection
            .filter(demographic_projection_dsl::id.eq(demographic_projection_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}
