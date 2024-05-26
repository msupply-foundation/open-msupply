use super::{
    demographic_indicator_row::demographic_indicator::dsl as demographic_indicator_dsl,
    StorageConnection,
};

use crate::Upsert;

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

table! {
    demographic_indicator(id) {
        id -> Text,
        name -> Text,
        base_year -> SmallInt,
        base_population -> Double,
        population_percentage -> Double,
        year_1_projection -> Double,
        year_2_projection -> Double,
        year_3_projection -> Double,
        year_4_projection -> Double,
        year_5_projection -> Double,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(table_name = demographic_indicator)]
pub struct DemographicIndicatorRow {
    pub id: String,
    pub name: String,
    pub base_year: i16,
    pub base_population: f64,
    pub population_percentage: f64,
    pub year_1_projection: f64,
    pub year_2_projection: f64,
    pub year_3_projection: f64,
    pub year_4_projection: f64,
    pub year_5_projection: f64,
}

pub struct DemographicIndicatorRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DemographicIndicatorRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DemographicIndicatorRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &DemographicIndicatorRow) -> Result<(), RepositoryError> {
        diesel::insert_into(demographic_indicator_dsl::demographic_indicator)
            .values(row)
            .on_conflict(demographic_indicator_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &DemographicIndicatorRow) -> Result<(), RepositoryError> {
        diesel::replace_into(demographic_indicator_dsl::demographic_indicator)
            .values(row)
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

impl Upsert for DemographicIndicatorRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        DemographicIndicatorRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            DemographicIndicatorRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
