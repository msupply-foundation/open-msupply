use super::{DBType, SiteRow, StorageConnection, site_row::site};
use crate::{
    EqualFilter, Pagination, Sort, StringFilter,
    diesel_macros::{apply_equal_filter, apply_sort, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
};
use diesel::prelude::*;

#[derive(Clone, PartialEq, Debug, Default)]
pub struct SiteFilter {
    pub id: Option<EqualFilter<i32>>,
    pub code: Option<StringFilter>,
    pub name: Option<StringFilter>,
    pub token: Option<EqualFilter<String>>,
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
                SiteSortField::Id => apply_sort!(query, sort, site::id),
                SiteSortField::Code => apply_sort_no_case!(query, sort, site::code),
                SiteSortField::Name => apply_sort_no_case!(query, sort, site::name),
            }
        } else {
            query = query.order(site::name.asc());
        }

        let result = query
            // Stable tiebreaker so paginated results don't shuffle or drop rows
            // when the primary sort column has ties.
            .then_order_by(site::id.asc())
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

    pub fn token(mut self, filter: EqualFilter<String>) -> Self {
        self.token = Some(filter);
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
        apply_equal_filter!(query, filter.token, site::token);
    }

    query
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{mock::MockDataInserts, test_db};

    // Every sort key, both directions. Postgres rejects a collation on a
    // non-text column (enum, date, integer) when planning, so this needs no rows.
    #[actix_rt::test]
    async fn test_site_sort() {
        let (_, connection, _, _) =
            test_db::setup_all("test_site_sort", MockDataInserts::none()).await;
        let repo = SiteRepository::new(&connection);

        for desc in [false, true] {
            for key in [SiteSortField::Id, SiteSortField::Code, SiteSortField::Name] {
                let sort = Sort {
                    key,
                    desc: Some(desc),
                };
                repo.query(Pagination::all(), None, Some(sort)).unwrap();
            }
        }
    }
}
