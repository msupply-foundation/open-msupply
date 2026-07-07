use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    map_filter,
    pagination::PaginationInput,
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{
    EqualFilter, PaginationOption, StockRelocationFilter, StockRelocationSort,
    StockRelocationSortField, StockRelocationStatus, StringFilter,
};
use service::auth::{Resource, ResourceAccessRequest};

use crate::types::{StockRelocationConnector, StockRelocationNode, StockRelocationNodeStatus};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::stock_relocation::StockRelocationSortField")]
pub enum StockRelocationSortFieldInput {
    CreatedDatetime,
    FinalisedDatetime,
    Status,
    NumberOfPacks,
    ItemCode,
    ItemName,
    Batch,
    ExpiryDate,
    FromLocation,
    ToLocation,
}

#[derive(InputObject)]
pub struct StockRelocationSortInput {
    /// Sort query result by `key`
    key: StockRelocationSortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterStockRelocationStatusInput {
    pub equal_to: Option<StockRelocationNodeStatus>,
    pub equal_any: Option<Vec<StockRelocationNodeStatus>>,
    pub not_equal_to: Option<StockRelocationNodeStatus>,
    pub not_equal_all: Option<Vec<StockRelocationNodeStatus>>,
}

#[derive(InputObject, Clone)]
pub struct StockRelocationFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub store_id: Option<EqualFilterStringInput>,
    pub status: Option<EqualFilterStockRelocationStatusInput>,
    pub item_code_or_name: Option<StringFilterInput>,
    pub from_location_code: Option<StringFilterInput>,
    pub to_location_code: Option<StringFilterInput>,
}

#[derive(Union)]
pub enum StockRelocationsResponse {
    Response(StockRelocationConnector),
}

#[derive(Union)]
pub enum StockRelocationResponse {
    Error(RecordNotFound),
    Response(StockRelocationNode),
}

pub fn get_stock_relocation(
    ctx: &Context<'_>,
    store_id: &str,
    id: &str,
) -> Result<StockRelocationResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStockLine,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let relocation = service_provider
        .stock_relocation_service
        .get_stock_relocation(&service_context, Some(store_id), id)
        .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(match relocation {
        Some(relocation) => {
            StockRelocationResponse::Response(StockRelocationNode::from_domain(relocation))
        }
        None => StockRelocationResponse::Error(RecordNotFound {}),
    })
}

pub fn get_stock_relocations(
    ctx: &Context<'_>,
    store_id: &str,
    page: Option<PaginationInput>,
    filter: Option<StockRelocationFilterInput>,
    sort: Option<Vec<StockRelocationSortInput>>,
) -> Result<StockRelocationsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStockLine,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .stock_relocation_service
        .get_stock_relocations(
            &service_context,
            Some(store_id),
            page.map(PaginationOption::from),
            filter.map(|filter| filter.to_domain()),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(StockRelocationsResponse::Response(
        StockRelocationConnector::from_domain(result),
    ))
}

impl StockRelocationFilterInput {
    pub fn to_domain(self) -> StockRelocationFilter {
        StockRelocationFilter {
            id: self.id.map(EqualFilter::from),
            store_id: self.store_id.map(EqualFilter::from),
            status: self
                .status
                .map(|t| map_filter!(t, StockRelocationStatus::from)),
            item_code_or_name: self.item_code_or_name.map(StringFilter::from),
            from_location_code: self.from_location_code.map(StringFilter::from),
            to_location_code: self.to_location_code.map(StringFilter::from),
        }
    }
}

impl StockRelocationSortInput {
    pub fn to_domain(self) -> StockRelocationSort {
        StockRelocationSort {
            key: StockRelocationSortField::from(self.key),
            desc: self.desc,
        }
    }
}
