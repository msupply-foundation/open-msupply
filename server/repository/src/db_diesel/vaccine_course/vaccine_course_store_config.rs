use super::vaccine_course_store_config_row::{
    vaccine_course_store_config, VaccineCourseStoreConfigRow,
};

use diesel::{helper_types::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, DBType, EqualFilter,
    StorageConnection,
};

#[derive(Clone, Default)]
pub struct VaccineCourseStoreConfigFilter {
    pub id: Option<EqualFilter<String>>,
    pub vaccine_course_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
}

impl VaccineCourseStoreConfigFilter {
    pub fn new() -> VaccineCourseStoreConfigFilter {
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

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
}

pub struct VaccineCourseStoreConfigRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseStoreConfigRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseStoreConfigRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<VaccineCourseStoreConfigFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: VaccineCourseStoreConfigFilter,
    ) -> Result<Option<VaccineCourseStoreConfigRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: VaccineCourseStoreConfigFilter,
    ) -> Result<Vec<VaccineCourseStoreConfigRow>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<VaccineCourseStoreConfigFilter>,
    ) -> Result<Vec<VaccineCourseStoreConfigRow>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result =
            query.load::<VaccineCourseStoreConfigRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedVaccineCourseStoreConfigQuery =
    IntoBoxed<'static, vaccine_course_store_config::table, DBType>;

fn create_filtered_query(
    filter: Option<VaccineCourseStoreConfigFilter>,
) -> BoxedVaccineCourseStoreConfigQuery {
    let mut query = vaccine_course_store_config::table.into_boxed();

    if let Some(f) = filter {
        let VaccineCourseStoreConfigFilter {
            id,
            vaccine_course_id,
            store_id,
        } = f;

        apply_equal_filter!(query, id, vaccine_course_store_config::id);
        apply_equal_filter!(
            query,
            vaccine_course_id,
            vaccine_course_store_config::vaccine_course_id
        );
        apply_equal_filter!(query, store_id, vaccine_course_store_config::store_id);
    }

    query
}
