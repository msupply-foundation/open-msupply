use super::immunisation_schedule_row::{
    immunisation_schedule::{self, dsl as immunisation_schedule_dsl},
    ImmunisationScheduleRow,
};

use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, DBType, EqualFilter,
    StorageConnection,
};

#[derive(Clone, Default)]
pub struct ImmunisationScheduleFilter {
    pub id: Option<EqualFilter<String>>,
    pub immunisation_id: Option<EqualFilter<String>>,
}

impl ImmunisationScheduleFilter {
    pub fn new() -> ImmunisationScheduleFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn immunisation_id(mut self, filter: EqualFilter<String>) -> Self {
        self.immunisation_id = Some(filter);
        self
    }
}

pub struct ImmunisationScheduleRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ImmunisationScheduleRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ImmunisationScheduleRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<ImmunisationScheduleFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: ImmunisationScheduleFilter,
    ) -> Result<Option<ImmunisationScheduleRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: ImmunisationScheduleFilter,
    ) -> Result<Vec<ImmunisationScheduleRow>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<ImmunisationScheduleFilter>,
    ) -> Result<Vec<ImmunisationScheduleRow>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result = query.load::<ImmunisationScheduleRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().collect())
    }
}

type BoxedImmunisationScheduleQuery = IntoBoxed<'static, immunisation_schedule::table, DBType>;

fn create_filtered_query(
    filter: Option<ImmunisationScheduleFilter>,
) -> BoxedImmunisationScheduleQuery {
    let mut query = immunisation_schedule_dsl::immunisation_schedule.into_boxed();

    if let Some(f) = filter {
        let ImmunisationScheduleFilter {
            id,
            immunisation_id,
        } = f;

        apply_equal_filter!(query, id, immunisation_schedule_dsl::id);
        apply_equal_filter!(
            query,
            immunisation_id,
            immunisation_schedule_dsl::immunisation_id
        );
    }
    query
}
