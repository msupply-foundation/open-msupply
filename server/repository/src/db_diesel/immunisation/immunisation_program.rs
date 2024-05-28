use super::immunisation_program_row::{
    immunisation_program::{self, dsl as immunisation_program_dsl},
    ImmunisationProgramRow,
};

use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    DBType, EqualFilter, Pagination, Sort, StorageConnection, StringFilter,
};

pub enum ImmunisationProgramSortField {
    Name,
}

pub type ImmunisationProgramSort = Sort<ImmunisationProgramSortField>;

#[derive(Clone, Default)]
pub struct ImmunisationProgramFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
}

impl ImmunisationProgramFilter {
    pub fn new() -> ImmunisationProgramFilter {
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
}

pub struct ImmunisationProgramRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ImmunisationProgramRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ImmunisationProgramRepository { connection }
    }

    pub fn count(&self, filter: Option<ImmunisationProgramFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: ImmunisationProgramFilter,
    ) -> Result<Option<ImmunisationProgramRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: ImmunisationProgramFilter,
    ) -> Result<Vec<ImmunisationProgramRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ImmunisationProgramFilter>,
        sort: Option<ImmunisationProgramSort>,
    ) -> Result<Vec<ImmunisationProgramRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                ImmunisationProgramSortField::Name => {
                    apply_sort_no_case!(query, sort, immunisation_program_dsl::name);
                }
            }
        } else {
            query = query.order(immunisation_program_dsl::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result =
            final_query.load::<ImmunisationProgramRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().collect())
    }
}

type BoxedImmunisationProgramQuery = IntoBoxed<'static, immunisation_program::table, DBType>;

fn create_filtered_query(
    filter: Option<ImmunisationProgramFilter>,
) -> BoxedImmunisationProgramQuery {
    let mut query = immunisation_program_dsl::immunisation_program.into_boxed();

    if let Some(f) = filter {
        let ImmunisationProgramFilter { id, name } = f;

        apply_equal_filter!(query, id, immunisation_program_dsl::id);
        apply_string_filter!(query, name, immunisation_program_dsl::name);
    }
    query
}
