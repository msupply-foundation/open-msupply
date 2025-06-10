use ::serde::Serialize;
use async_graphql::*;
use graphql_core::simple_generic_errors::FailedTranslation;
use graphql_core::standard_graphql_error::{list_error_to_gql_err, StandardGraphqlError};
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    standard_graphql_error::validate_auth,
};
use graphql_core::{map_filter, ContextExt};
use graphql_types::types::FormSchemaNode;
use repository::{
    ContextType as ReportContextDomain, EqualFilter, PaginationOption, Report, ReportFilter,
    ReportSort, ReportSortField, StringFilter,
};
use service::auth::{Resource, ResourceAccessRequest};
use service::report::report_service::{GetReportError, GetReportsError};
use service::{usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ReportSortFieldInput {
    Id,
    Name,
    Code,
    Version,
}

#[derive(InputObject)]
pub struct ReportSortInput {
    /// Sort query result by `key`
    key: ReportSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(Debug, Enum, Copy, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ReportContext {
    Asset,
    InboundShipment,
    OutboundShipment,
    Requisition,
    Stocktake,
    Resource,
    Patient,
    Dispensary,
    Repack,
    OutboundReturn,
    InboundReturn,
    Report,
    Prescription,
    InternalOrder,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterReportContextInput {
    pub equal_to: Option<ReportContext>,
    pub equal_any: Option<Vec<ReportContext>>,
    pub not_equal_to: Option<ReportContext>,
}

#[derive(InputObject, Clone)]
pub struct ReportFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
    pub context: Option<EqualFilterReportContextInput>,
    pub sub_context: Option<EqualFilterStringInput>,
    pub is_active: Option<bool>,
}

#[derive(Union)]
pub enum ReportResponse {
    Report(ReportNode),
    Error(QueryReportError),
}

#[derive(Union)]
pub enum ReportsResponse {
    Response(ReportConnector),
    Error(QueryReportsError),
}

#[derive(SimpleObject)]
pub struct ReportConnector {
    total_count: u32,
    nodes: Vec<ReportNode>,
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum QueryReportErrorInterface {
    ReportTranslationError(FailedTranslation),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum QueryReportsErrorInterface {
    ReportsTranslationError(FailedTranslation),
}

#[derive(SimpleObject)]
pub struct QueryReportError {
    pub error: QueryReportErrorInterface,
}

#[derive(SimpleObject)]
pub struct QueryReportsError {
    pub error: QueryReportsErrorInterface,
}

#[derive(PartialEq, Debug)]
pub struct ReportNode {
    row: Report,
}

#[Object]
impl ReportNode {
    pub async fn id(&self) -> &str {
        &self.row.report_row.id
    }

    /// Human readable name of the report
    pub async fn name(&self) -> &str {
        &self.row.report_row.name
    }

    pub async fn code(&self) -> &str {
        &self.row.report_row.code
    }

    pub async fn context(&self) -> ReportContext {
        ReportContext::from_domain(&self.row.report_row.context)
    }

    pub async fn sub_context(&self) -> &Option<String> {
        &self.row.report_row.sub_context
    }

    pub async fn is_custom(&self) -> bool {
        self.row.report_row.is_custom
    }

    pub async fn is_active(&self) -> bool {
        self.row.report_row.is_active
    }

    pub async fn argument_schema(&self) -> Option<FormSchemaNode> {
        self.row
            .argument_schema
            .clone()
            .map(|schema| FormSchemaNode { schema })
    }

    pub async fn version(&self) -> &str {
        &self.row.report_row.version
    }
}

impl ReportNode {
    pub fn from_domain(row: Report) -> ReportNode {
        ReportNode { row }
    }

    pub fn row(&self) -> &Report {
        &self.row
    }
}

impl ReportConnector {
    pub fn from_domain(reports: ListResult<Report>) -> ReportConnector {
        ReportConnector {
            total_count: reports.count,
            nodes: reports
                .rows
                .into_iter()
                .map(ReportNode::from_domain)
                .collect(),
        }
    }
}

pub fn report(
    ctx: &Context<'_>,
    store_id: String,
    user_language: String,
    id: String,
) -> Result<ReportResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::Report,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id, user.user_id)?;
    let translation_service = &service_provider.translations_service;

    match service_provider.report_service.get_report(
        &service_context,
        translation_service,
        user_language,
        &id,
    ) {
        Ok(report) => Ok(ReportResponse::Report(ReportNode { row: report })),
        Err(err) => map_report_error(err),
    }
}

pub fn reports(
    ctx: &Context<'_>,
    store_id: String,
    user_language: String,
    filter: Option<ReportFilterInput>,
    sort: Option<Vec<ReportSortInput>>,
) -> Result<ReportsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::Report,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id, user.user_id)?;
    let translation_service = &service_provider.translations_service;

    match service_provider.report_service.query_reports(
        &service_context,
        &translation_service,
        user_language,
        filter.map(|f| f.to_domain()),
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    ) {
        Ok(reports) => Ok(ReportsResponse::Response(ReportConnector {
            total_count: reports.len() as u32,
            nodes: reports.into_iter().map(|row| ReportNode { row }).collect(),
        })),
        Err(err) => map_reports_error(err),
    }
}

pub fn all_report_versions(
    ctx: &Context<'_>,
    store_id: String,
    user_language: String,
    filter: Option<ReportFilterInput>,
    sort: Option<Vec<ReportSortInput>>,
    pagination: Option<PaginationOption>,
) -> Result<ReportsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id, user.user_id)?;
    let translation_service = &service_provider.translations_service;

    let reports = match service_provider.report_service.query_all_report_versions(
        &service_context,
        &translation_service,
        user_language,
        filter.map(|f| f.to_domain()),
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
        pagination,
    ) {
        Ok(reports) => reports,
        Err(err) => return map_reports_error(err),
    };

    Ok(ReportsResponse::Response(ReportConnector::from_domain(
        reports,
    )))
}

impl ReportFilterInput {
    pub fn to_domain(self) -> ReportFilter {
        ReportFilter {
            id: self.id.map(EqualFilter::from),
            name: self.name.map(StringFilter::from),
            context: self
                .context
                .map(|t| map_filter!(t, ReportContext::to_domain)),
            sub_context: self.sub_context.map(EqualFilter::from),
            code: None,
            is_custom: None,
            is_active: self.is_active,
        }
    }
}

impl ReportSortInput {
    pub fn to_domain(self) -> ReportSort {
        let key = match self.key {
            ReportSortFieldInput::Id => ReportSortField::Id,
            ReportSortFieldInput::Name => ReportSortField::Name,
            ReportSortFieldInput::Code => ReportSortField::Code,
            ReportSortFieldInput::Version => ReportSortField::Version,
        };
        ReportSort {
            key,
            desc: self.desc,
        }
    }
}

impl ReportContext {
    pub fn to_domain(self) -> ReportContextDomain {
        match self {
            ReportContext::Asset => ReportContextDomain::Asset,
            ReportContext::InboundShipment => ReportContextDomain::InboundShipment,
            ReportContext::OutboundShipment => ReportContextDomain::OutboundShipment,
            ReportContext::Requisition => ReportContextDomain::Requisition,
            ReportContext::Stocktake => ReportContextDomain::Stocktake,
            ReportContext::Resource => ReportContextDomain::Resource,
            ReportContext::Patient => ReportContextDomain::Patient,
            ReportContext::Dispensary => ReportContextDomain::Dispensary,
            ReportContext::Repack => ReportContextDomain::Repack,
            ReportContext::OutboundReturn => ReportContextDomain::OutboundReturn,
            ReportContext::InboundReturn => ReportContextDomain::InboundReturn,
            ReportContext::Report => ReportContextDomain::Report,
            ReportContext::Prescription => ReportContextDomain::Prescription,
            ReportContext::InternalOrder => ReportContextDomain::InternalOrder,
        }
    }

    pub fn from_domain(context: &ReportContextDomain) -> ReportContext {
        match context {
            ReportContextDomain::Asset => ReportContext::Asset,
            ReportContextDomain::InboundShipment => ReportContext::InboundShipment,
            ReportContextDomain::OutboundShipment => ReportContext::OutboundShipment,
            ReportContextDomain::Requisition => ReportContext::Requisition,
            ReportContextDomain::Stocktake => ReportContext::Stocktake,
            ReportContextDomain::Resource => ReportContext::Resource,
            ReportContextDomain::Patient => ReportContext::Patient,
            ReportContextDomain::Dispensary => ReportContext::Dispensary,
            ReportContextDomain::Repack => ReportContext::Repack,
            ReportContextDomain::OutboundReturn => ReportContext::OutboundReturn,
            ReportContextDomain::InboundReturn => ReportContext::InboundReturn,
            ReportContextDomain::Report => ReportContext::Report,
            ReportContextDomain::Prescription => ReportContext::Prescription,
            ReportContextDomain::InternalOrder => ReportContext::InternalOrder,
        }
    }
}

fn map_report_error(error: GetReportError) -> Result<ReportResponse> {
    match error {
        GetReportError::TranslationError(error) => Ok(ReportResponse::Error(QueryReportError {
            error: QueryReportErrorInterface::ReportTranslationError(FailedTranslation(
                error.to_string(),
            )),
        })),
        GetReportError::RepositoryError(error) => {
            Err(StandardGraphqlError::from_repository_error(error))
        }
    }
}

fn map_reports_error(error: GetReportsError) -> Result<ReportsResponse> {
    match error {
        GetReportsError::TranslationError(error) => Ok(ReportsResponse::Error(QueryReportsError {
            error: QueryReportsErrorInterface::ReportsTranslationError(FailedTranslation(
                error.to_string(),
            )),
        })),
        GetReportsError::ListError(error) => Err(list_error_to_gql_err(error)),
    }
}
