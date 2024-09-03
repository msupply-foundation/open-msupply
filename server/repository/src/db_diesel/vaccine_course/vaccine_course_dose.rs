use super::vaccine_course_dose_row::{
    vaccine_course_dose::{self, dsl as vaccine_course_dose_dsl},
    VaccineCourseDoseRow,
};

use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, DBType, EqualFilter,
    StorageConnection,
};

#[derive(Clone, Default)]
pub struct VaccineCourseDoseFilter {
    pub id: Option<EqualFilter<String>>,
    pub vaccine_course_id: Option<EqualFilter<String>>,
}

impl VaccineCourseDoseFilter {
    pub fn new() -> VaccineCourseDoseFilter {
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

pub struct VaccineCourseDoseRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseDoseRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseDoseRepository { connection }
    }

    pub fn count(&self, filter: Option<VaccineCourseDoseFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: VaccineCourseDoseFilter,
    ) -> Result<Option<VaccineCourseDoseRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: VaccineCourseDoseFilter,
    ) -> Result<Vec<VaccineCourseDoseRow>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<VaccineCourseDoseFilter>,
    ) -> Result<Vec<VaccineCourseDoseRow>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result = query.load::<VaccineCourseDoseRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().collect())
    }
}

type BoxedVaccineCourseDoseQuery = IntoBoxed<'static, vaccine_course_dose::table, DBType>;

fn create_filtered_query(filter: Option<VaccineCourseDoseFilter>) -> BoxedVaccineCourseDoseQuery {
    let mut query = vaccine_course_dose_dsl::vaccine_course_dose.into_boxed();

    if let Some(f) = filter {
        let VaccineCourseDoseFilter {
            id,
            vaccine_course_id,
        } = f;

        apply_equal_filter!(query, id, vaccine_course_dose_dsl::id);
        apply_equal_filter!(
            query,
            vaccine_course_id,
            vaccine_course_dose_dsl::vaccine_course_id
        );
    }
    query
}
