use super::immunisation_row::{
    immunisation::{self, dsl as immunisation_dsl},
    ImmunisationRow,
};

use diesel::{dsl::IntoBoxed, prelude::*};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    DBType, EqualFilter, Pagination, Sort, StorageConnection, StringFilter,
};

pub enum ImmunisationSortField {
    Name,
}

pub type ImmunisationSort = Sort<ImmunisationSortField>;

#[derive(Clone, Default)]
pub struct ImmunisationFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub immunisation_program_id: Option<EqualFilter<String>>,
}

impl ImmunisationFilter {
    pub fn new() -> ImmunisationFilter {
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

    pub fn immunisation_program_id(mut self, filter: EqualFilter<String>) -> Self {
        self.immunisation_program_id = Some(filter);
        self
    }
}

pub struct ImmunisationRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ImmunisationRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ImmunisationRepository { connection }
    }

    pub fn count(&self, filter: Option<ImmunisationFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: ImmunisationFilter,
    ) -> Result<Option<ImmunisationRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: ImmunisationFilter,
    ) -> Result<Vec<ImmunisationRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ImmunisationFilter>,
        sort: Option<ImmunisationSort>,
    ) -> Result<Vec<ImmunisationRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                ImmunisationSortField::Name => {
                    apply_sort_no_case!(query, sort, immunisation_dsl::name);
                }
            }
        } else {
            query = query.order(immunisation_dsl::id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //    "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<ImmunisationRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(immunisation_row: ImmunisationRow) -> ImmunisationRow {
    immunisation_row
}

type BoxedImmunisationQuery = IntoBoxed<'static, immunisation::table, DBType>;

fn create_filtered_query(filter: Option<ImmunisationFilter>) -> BoxedImmunisationQuery {
    let mut query = immunisation_dsl::immunisation.into_boxed();

    if let Some(f) = filter {
        let ImmunisationFilter {
            id,
            name,
            immunisation_program_id,
        } = f;

        apply_equal_filter!(query, id, immunisation_dsl::id);
        apply_string_filter!(query, name, immunisation_dsl::name);
        apply_equal_filter!(
            query,
            immunisation_program_id,
            immunisation_dsl::immunisation_program_id
        );
    }
    query
}
