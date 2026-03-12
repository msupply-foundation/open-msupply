use super::vaccine_course_store_wastage_row::{
    vaccine_course_store_wastage, VaccineCourseStoreWastageRow,
};

use diesel::{helper_types::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::apply_equal_filter, repository_error::RepositoryError, DBType, EqualFilter,
    StorageConnection,
};

#[derive(Clone, Default)]
pub struct VaccineCourseStoreWastageFilter {
    pub id: Option<EqualFilter<String>>,
    pub vaccine_course_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
}

impl VaccineCourseStoreWastageFilter {
    pub fn new() -> VaccineCourseStoreWastageFilter {
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

pub struct VaccineCourseStoreWastageRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseStoreWastageRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseStoreWastageRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<VaccineCourseStoreWastageFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: VaccineCourseStoreWastageFilter,
    ) -> Result<Option<VaccineCourseStoreWastageRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: VaccineCourseStoreWastageFilter,
    ) -> Result<Vec<VaccineCourseStoreWastageRow>, RepositoryError> {
        self.query(Some(filter))
    }

    pub fn query(
        &self,
        filter: Option<VaccineCourseStoreWastageFilter>,
    ) -> Result<Vec<VaccineCourseStoreWastageRow>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result =
            query.load::<VaccineCourseStoreWastageRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedVaccineCourseStoreWastageQuery =
    IntoBoxed<'static, vaccine_course_store_wastage::table, DBType>;

fn create_filtered_query(
    filter: Option<VaccineCourseStoreWastageFilter>,
) -> BoxedVaccineCourseStoreWastageQuery {
    let mut query = vaccine_course_store_wastage::table.into_boxed();

    if let Some(f) = filter {
        let VaccineCourseStoreWastageFilter {
            id,
            vaccine_course_id,
            store_id,
        } = f;

        apply_equal_filter!(query, id, vaccine_course_store_wastage::id);
        apply_equal_filter!(
            query,
            vaccine_course_id,
            vaccine_course_store_wastage::vaccine_course_id
        );
        apply_equal_filter!(query, store_id, vaccine_course_store_wastage::store_id);
    }

    query
}
