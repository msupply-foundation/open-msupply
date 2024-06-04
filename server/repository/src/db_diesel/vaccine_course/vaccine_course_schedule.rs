use super::vaccine_course_schedule_row::{
    vaccine_course_schedule::{self, dsl as vaccine_course_schedule_dsl},
    VaccineCourseScheduleRow,
};

use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, DBType, EqualFilter,
    StorageConnection,
};

#[derive(Clone, Default)]
pub struct VaccineCourseScheduleFilter {
    pub id: Option<EqualFilter<String>>,
    pub vaccine_course_id: Option<EqualFilter<String>>,
}

impl VaccineCourseScheduleFilter {
    pub fn new() -> VaccineCourseScheduleFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn vaccine_course_id(mut self, filter: EqualFilter<String>) -> Self {
        self.vaccine_course_id = Some(filter);
        self
    }
}

pub struct VaccineCourseScheduleRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseScheduleRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseScheduleRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<VaccineCourseScheduleFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: VaccineCourseScheduleFilter,
    ) -> Result<Option<VaccineCourseScheduleRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: VaccineCourseScheduleFilter,
    ) -> Result<Vec<VaccineCourseScheduleRow>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<VaccineCourseScheduleFilter>,
    ) -> Result<Vec<VaccineCourseScheduleRow>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result = query.load::<VaccineCourseScheduleRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().collect())
    }
}

type BoxedVaccineCourseScheduleQuery = IntoBoxed<'static, vaccine_course_schedule::table, DBType>;

fn create_filtered_query(
    filter: Option<VaccineCourseScheduleFilter>,
) -> BoxedVaccineCourseScheduleQuery {
    let mut query = vaccine_course_schedule_dsl::vaccine_course_schedule.into_boxed();

    if let Some(f) = filter {
        let VaccineCourseScheduleFilter {
            id,
            vaccine_course_id,
        } = f;

        apply_equal_filter!(query, id, vaccine_course_schedule_dsl::id);
        apply_equal_filter!(
            query,
            vaccine_course_id,
            vaccine_course_schedule_dsl::vaccine_course_id
        );
    }
    query
}
