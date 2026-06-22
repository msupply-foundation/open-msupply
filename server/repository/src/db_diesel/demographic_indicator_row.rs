use super::StorageConnection;

use crate::{
    diesel_macros::define_batch_table, ChangelogRepository, RepositoryError, RowActionType,
    SourceSiteId,
};

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

define_batch_table! {
    struct: DemographicIndicatorRow,
    repo: DemographicIndicatorRowRepository,
    table: demographic_indicator(id) {
        id -> Text,
        demographic_id -> Text,
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
    pub demographic_id: String,
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

    pub(crate) fn _upsert_one(&self, row: &DemographicIndicatorRow) -> Result<(), RepositoryError> {
        diesel::insert_into(demographic_indicator::table)
            .values(row)
            .on_conflict(demographic_indicator::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub fn upsert_one(&self, row: &DemographicIndicatorRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        let changelog = DemographicIndicatorRow::generate_changelog(
            row.id.clone(),
            self.connection,
            RowActionType::Upsert,
            SourceSiteId::CurrentSiteId,
        )?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(
        &self,
        demographic_indicator_id: &str,
    ) -> Result<Option<DemographicIndicatorRow>, RepositoryError> {
        let result = demographic_indicator::table
            .filter(demographic_indicator::id.eq(demographic_indicator_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<DemographicIndicatorRow>, RepositoryError> {
        Ok(demographic_indicator::table
            .filter(demographic_indicator::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}
