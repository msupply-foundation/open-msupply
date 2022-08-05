use ::serde::Serialize;
use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, SimpleStringFilterInput},
    pagination::PaginationInput,
    standard_graphql_error::validate_auth,
};
use graphql_core::{map_filter, ContextExt};
use repository::{
    EqualFilter, PaginationOption, ReportContext as ReportContextDomain, ReportFilter, ReportRow,
    ReportSort, ReportSortField, SimpleStringFilter,
};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ReportSortFieldInput {
    Id,
    Name,
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
    InboundShipment,
    OutboundShipment,
    Requisition,
    Stocktake,
    Resource,
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
    pub name: Option<SimpleStringFilterInput>,
    pub context: Option<EqualFilterReportContextInput>,
}

#[derive(Union)]
pub enum ReportsResponse {
    Response(ReportConnector),
}

#[derive(SimpleObject)]
pub struct ReportConnector {
    total_count: u32,
    nodes: Vec<ReportNode>,
}

#[derive(PartialEq, Debug)]
pub struct ReportNode {
    row: ReportRow,
}

#[Object]
impl ReportNode {
    pub async fn id(&self) -> &str {
        &self.row.id
    }

    /// Human readable name of the report
    pub async fn name(&self) -> &str {
        &self.row.name
    }
    pub async fn context(&self) -> ReportContext {
        match self.row.context {
            ReportContextDomain::InboundShipment => ReportContext::InboundShipment,
            ReportContextDomain::OutboundShipment => ReportContext::OutboundShipment,
            ReportContextDomain::Requisition => ReportContext::Requisition,
            ReportContextDomain::Stocktake => ReportContext::Stocktake,
            ReportContextDomain::Resource => ReportContext::Resource,
        }
    }
}

pub fn reports(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
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
    let service_context = service_provider.context(&store_id, &user.user_id)?;

    let reports = service_provider
        .report_service
        .query_reports(
            &service_context,
            page.map(PaginationOption::from),
            filter.map(|f| f.to_domain()),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;
    Ok(ReportsResponse::Response(ReportConnector {
        total_count: reports.len() as u32,
        nodes: reports.into_iter().map(|row| ReportNode { row }).collect(),
    }))
}

impl ReportFilterInput {
    pub fn to_domain(self) -> ReportFilter {
        ReportFilter {
            id: self.id.map(EqualFilter::from),
            name: self.name.map(SimpleStringFilter::from),
            r#type: None,
            context: self
                .context
                .map(|t| map_filter!(t, ReportContext::to_domain)),
        }
    }
}

impl ReportSortInput {
    pub fn to_domain(self) -> ReportSort {
        let key = match self.key {
            ReportSortFieldInput::Id => ReportSortField::Id,
            ReportSortFieldInput::Name => ReportSortField::Name,
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
            ReportContext::InboundShipment => ReportContextDomain::InboundShipment,
            ReportContext::OutboundShipment => ReportContextDomain::OutboundShipment,
            ReportContext::Requisition => ReportContextDomain::Requisition,
            ReportContext::Stocktake => ReportContextDomain::Stocktake,
            ReportContext::Resource => ReportContextDomain::Resource,
        }
    }
}
