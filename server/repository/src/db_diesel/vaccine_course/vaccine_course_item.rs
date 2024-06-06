use super::vaccine_course_item_row::{
    vaccine_course_item::{self, dsl as vaccine_course_item_dsl},
    VaccineCourseItemRow,
};

use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, DBType, EqualFilter,
    StorageConnection,
};

#[derive(Clone, Default)]
pub struct VaccineCourseItemFilter {
    pub id: Option<EqualFilter<String>>,
    pub vaccine_course_id: Option<EqualFilter<String>>,
}

impl VaccineCourseItemFilter {
    pub fn new() -> VaccineCourseItemFilter {
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

pub struct VaccineCourseItemRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseItemRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseItemRepository { connection }
    }

    pub fn count(&self, filter: Option<VaccineCourseItemFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: VaccineCourseItemFilter,
    ) -> Result<Option<VaccineCourseItemRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: VaccineCourseItemFilter,
    ) -> Result<Vec<VaccineCourseItemRow>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<VaccineCourseItemFilter>,
    ) -> Result<Vec<VaccineCourseItemRow>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result = query.load::<VaccineCourseItemRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().collect())
    }
}

type BoxedVaccineCourseItemQuery = IntoBoxed<'static, vaccine_course_item::table, DBType>;

fn create_filtered_query(filter: Option<VaccineCourseItemFilter>) -> BoxedVaccineCourseItemQuery {
    let mut query = vaccine_course_item_dsl::vaccine_course_item.into_boxed();

    if let Some(f) = filter {
        let VaccineCourseItemFilter {
            id,
            vaccine_course_id,
        } = f;

        apply_equal_filter!(query, id, vaccine_course_item_dsl::id);
        apply_equal_filter!(
            query,
            vaccine_course_id,
            vaccine_course_item_dsl::vaccine_course_id
        );
    }
    query
}
