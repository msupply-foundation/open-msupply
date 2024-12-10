use super::{
    form_schema_row::{self, form_schema::dsl as form_schema_dsl},
    report_row::report::{self, dsl as report_dsl},
    ContextType, ReportMetaDataRow, ReportRow, ReportType, StorageConnection,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    schema_from_row, FormSchema, FormSchemaRow,
};
use crate::{EqualFilter, Sort, StringFilter};

use crate::{diesel_macros::apply_string_filter, DBType, RepositoryError};

use diesel::{dsl::IntoBoxed, helper_types::LeftJoin, prelude::*};
use util::inline_init;

#[derive(Debug, Clone, PartialEq)]
pub struct Report {
    pub report_row: ReportRow,
    pub argument_schema: Option<FormSchema>,
}

#[derive(Debug, Clone, Default)]
pub struct ReportFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub r#type: Option<EqualFilter<ReportType>>,
    pub context: Option<EqualFilter<ContextType>>,
    pub sub_context: Option<EqualFilter<String>>,
    pub code: Option<EqualFilter<String>>,
    pub is_custom: Option<bool>,
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

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<ReportType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn context(mut self, filter: EqualFilter<ContextType>) -> Self {
        self.context = Some(filter);
        self
    }

    pub fn code(mut self, filter: EqualFilter<String>) -> Self {
        self.code = Some(filter);
        self
    }

    pub fn is_custom(mut self, value: bool) -> Self {
        self.is_custom = Some(value);
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

type ReportJoin = (ReportRow, Option<FormSchemaRow>);

pub struct ReportRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ReportRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ReportRepository { connection }
    }

    pub fn count(&self, filter: Option<ReportFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(&self, filter: ReportFilter) -> Result<Vec<Report>, RepositoryError> {
        self.query(Some(filter), None)
    }

    pub fn query(
        &self,
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
        let result = query.load::<ReportJoin>(self.connection.lock().connection())?;

        result
            .into_iter()
            .map(map_report_row_join_to_report)
            .collect::<Result<Vec<Report>, RepositoryError>>()
    }

    pub fn query_meta_data(
        &self,
        filter: Option<ReportFilter>,
        sort: Option<ReportSort>,
    ) -> Result<Vec<ReportMetaDataRow>, RepositoryError> {
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
        Ok(query
            .select(ReportMetaDataRow::as_select())
            .load::<ReportMetaDataRow>(self.connection.lock().connection())?)
    }
}

type BoxedStoreQuery =
    IntoBoxed<'static, LeftJoin<report::table, form_schema_row::form_schema::table>, DBType>;

fn create_filtered_query(filter: Option<ReportFilter>) -> BoxedStoreQuery {
    let mut query = report_dsl::report
        .left_join(form_schema_dsl::form_schema)
        .into_boxed();

    if let Some(f) = filter {
        let ReportFilter {
            id,
            name,
            r#type,
            context,
            sub_context,
            code,
            is_custom,
        } = f;

        apply_equal_filter!(query, id, report_dsl::id);
        apply_string_filter!(query, name, report_dsl::name);
        apply_equal_filter!(query, r#type, report_dsl::type_);
        apply_equal_filter!(query, context, report_dsl::context);
        apply_equal_filter!(query, sub_context, report_dsl::sub_context);
        apply_equal_filter!(query, code, report_dsl::code);
        if let Some(is_custom) = is_custom {
            query = query.filter(report_dsl::is_custom.eq(is_custom));
        }
    }

    query
}

fn map_report_row_join_to_report(
    (report_row, argument_schema): ReportJoin,
) -> Result<Report, RepositoryError> {
    Ok(Report {
        report_row,
        argument_schema: argument_schema.map(schema_from_row).transpose()?,
    })
}
