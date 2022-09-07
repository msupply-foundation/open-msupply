use super::{
    report_row::{report, report::dsl as report_dsl},
    ReportContext, ReportRow, ReportType, StorageConnection,
};

use crate::diesel_macros::{apply_equal_filter, apply_sort_no_case};
use crate::{EqualFilter, Pagination, SimpleStringFilter, Sort};

use crate::{diesel_macros::apply_simple_string_filter, DBType, RepositoryError};

use diesel::{dsl::IntoBoxed, prelude::*};
use util::inline_init;

pub type Report = ReportRow;

#[derive(Debug, Clone, Default)]
pub struct ReportFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<SimpleStringFilter>,
    pub r#type: Option<EqualFilter<ReportType>>,
    pub context: Option<EqualFilter<ReportContext>>,
}

#[derive(PartialEq, Debug)]
pub enum ReportSortField {
    Id,
    Name,
}

pub type ReportSort = Sort<ReportSortField>;

impl ReportFilter {
    pub fn new() -> ReportFilter {
        ReportFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: SimpleStringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<ReportType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn context(mut self, filter: EqualFilter<ReportContext>) -> Self {
        self.context = Some(filter);
        self
    }
}

impl ReportType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }

    pub fn not_equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.not_equal_to = Some(self.clone()))
    }

    pub fn equal_any(value: Vec<Self>) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_any = Some(value))
    }
}

pub struct ReportRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ReportRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ReportRepository { connection }
    }

    pub fn count(&self, filter: Option<ReportFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(&self, filter: ReportFilter) -> Result<Vec<Report>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ReportFilter>,
        sort: Option<ReportSort>,
    ) -> Result<Vec<Report>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                ReportSortField::Id => {
                    apply_sort_no_case!(query, sort, report_dsl::id);
                }
                ReportSortField::Name => {
                    apply_sort_no_case!(query, sort, report_dsl::name);
                }
            }
        }
        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<Report>(&self.connection.connection)?;

        Ok(result)
    }
}

type BoxedStoreQuery = IntoBoxed<'static, report::table, DBType>;

fn create_filtered_query(filter: Option<ReportFilter>) -> BoxedStoreQuery {
    let mut query = report_dsl::report.into_boxed();

    if let Some(f) = filter {
        let ReportFilter {
            id,
            name,
            r#type,
            context,
        } = f;

        apply_equal_filter!(query, id, report_dsl::id);
        apply_simple_string_filter!(query, name, report_dsl::name);
        apply_equal_filter!(query, r#type, report_dsl::type_);
        apply_equal_filter!(query, context, report_dsl::context);
    }

    query
}
