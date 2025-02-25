use super::vaccine_course_row::{vaccine_course, VaccineCourseRow};

use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    DBType, EqualFilter, Pagination, Sort, StorageConnection, StringFilter,
};

pub enum VaccineCourseSortField {
    Name,
}

pub type VaccineCourseSort = Sort<VaccineCourseSortField>;

#[derive(Clone, Default)]
pub struct VaccineCourseFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub program_id: Option<EqualFilter<String>>,
    pub include_deleted: Option<bool>,
}

impl VaccineCourseFilter {
    pub fn new() -> VaccineCourseFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn program_id(mut self, filter: EqualFilter<String>) -> Self {
        self.program_id = Some(filter);
        self
    }

    pub fn include_deleted(mut self, filter: bool) -> Self {
        self.include_deleted = Some(filter);
        self
    }
}

pub struct VaccineCourseRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> VaccineCourseRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        VaccineCourseRepository { connection }
    }

    pub fn count(&self, filter: Option<VaccineCourseFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: VaccineCourseFilter,
    ) -> Result<Option<VaccineCourseRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: VaccineCourseFilter,
    ) -> Result<Vec<VaccineCourseRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<VaccineCourseFilter>,
        sort: Option<VaccineCourseSort>,
    ) -> Result<Vec<VaccineCourseRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                VaccineCourseSortField::Name => {
                    apply_sort_no_case!(query, sort, vaccine_course::name);
                }
            }
        } else {
            query = query.order(vaccine_course::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<VaccineCourseRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(vaccine_course_row: VaccineCourseRow) -> VaccineCourseRow {
    vaccine_course_row
}

type BoxedVaccineCourseQuery = IntoBoxed<'static, vaccine_course::table, DBType>;

fn create_filtered_query(filter: Option<VaccineCourseFilter>) -> BoxedVaccineCourseQuery {
    let mut query = vaccine_course::table.into_boxed();

    if let Some(f) = filter.clone() {
        let VaccineCourseFilter {
            id,
            name,
            program_id,
            include_deleted: _,
        } = f;

        apply_equal_filter!(query, id, vaccine_course::id);
        apply_string_filter!(query, name, vaccine_course::name);
        apply_equal_filter!(query, program_id, vaccine_course::program_id);
    }

    // Filter out deleted rows, unless include_deleted is set to true
    if !filter.and_then(|f| f.include_deleted).unwrap_or(false) {
        query = query.filter(vaccine_course::deleted_datetime.is_null());
    }

    query
}
