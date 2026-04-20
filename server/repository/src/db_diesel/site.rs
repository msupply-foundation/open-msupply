use super::{site_row::site, DBType, SiteRow, StorageConnection};
use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    EqualFilter, Pagination, Sort, StringFilter,
};
use diesel::prelude::*;

#[derive(Clone, PartialEq, Debug, Default)]
pub struct SiteFilter {
    pub id: Option<EqualFilter<i32>>,
    pub code: Option<StringFilter>,
    pub name: Option<StringFilter>,
}

#[derive(PartialEq, Debug)]
pub enum SiteSortField {
    Id,
    Code,
    Name,
}

pub type SiteSort = Sort<SiteSortField>;

pub struct SiteRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SiteRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SiteRepository { connection }
    }

    pub fn count(&self, filter: Option<SiteFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<SiteFilter>,
        sort: Option<SiteSort>,
    ) -> Result<Vec<SiteRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                SiteSortField::Id => apply_sort_no_case!(query, sort, site::id),
                SiteSortField::Code => apply_sort_no_case!(query, sort, site::code),
                SiteSortField::Name => apply_sort_no_case!(query, sort, site::name),
            }
        } else {
            query = query.order(site::name.asc());
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<SiteRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}

impl SiteFilter {
    pub fn new() -> SiteFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<i32>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn code(mut self, filter: StringFilter) -> Self {
        self.code = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }
}

type BoxedSiteQuery = site::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<SiteFilter>) -> BoxedSiteQuery {
    let mut query = site::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, site::id);
        apply_string_filter!(query, filter.code, site::code);
        apply_string_filter!(query, filter.name, site::name);
    }

    query
}
