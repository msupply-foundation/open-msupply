use super::program_row::{program, program::dsl as program_dsl};
use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    DBType, ProgramRow, StorageConnection, StringFilter,
};
use crate::{EqualFilter, Pagination, Sort};

use diesel::{dsl::IntoBoxed, prelude::*};

pub type Program = ProgramRow;

#[derive(Clone, Default)]
pub struct ProgramFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub context_id: Option<EqualFilter<String>>,
    pub is_immunisation: Option<bool>,
}

#[derive(PartialEq, Debug)]
pub enum ProgramSortField {
    Name,
}

pub type ProgramSort = Sort<ProgramSortField>;

pub struct ProgramRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramRepository { connection }
    }

    pub fn count(&self, filter: Option<ProgramFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(&self, filter: ProgramFilter) -> Result<Vec<Program>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query_one(&self, filter: ProgramFilter) -> Result<Option<Program>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ProgramFilter>,
        sort: Option<ProgramSort>,
    ) -> Result<Vec<Program>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                ProgramSortField::Name => {
                    apply_sort_no_case!(query, sort, program_dsl::name);
                }
            }
        } else {
            query = query.order(program_dsl::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<Program>(self.connection.lock().connection())?;
        Ok(result)
    }
}

type BoxedUserProgramQuery = IntoBoxed<'static, program::table, DBType>;

fn create_filtered_query(filter: Option<ProgramFilter>) -> BoxedUserProgramQuery {
    let mut query = program_dsl::program.into_boxed();

    if let Some(f) = filter {
        let ProgramFilter {
            id,
            name,
            context_id,
            is_immunisation,
        } = f;

        apply_equal_filter!(query, id, program_dsl::id);
        apply_string_filter!(query, name, program_dsl::name);
        apply_equal_filter!(query, context_id, program_dsl::context_id);
        if let Some(is_immunisation) = is_immunisation {
            query = query.filter(program_dsl::is_immunisation.eq(is_immunisation));
        }
    }

    query = query.filter(program_dsl::deleted_datetime.is_null());
    query = query.filter(program_dsl::id.ne("missing_program"));

    query
}

impl ProgramFilter {
    pub fn new() -> Self {
        ProgramFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn context_id(mut self, filter: EqualFilter<String>) -> Self {
        self.context_id = Some(filter);
        self
    }

    pub fn is_immunisation(mut self, filter: bool) -> Self {
        self.is_immunisation = Some(filter);
        self
    }
}
