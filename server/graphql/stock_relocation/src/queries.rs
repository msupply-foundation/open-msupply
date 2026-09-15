use async_graphql::*;
use graphql_core::{
    generic_filters::{
        DatetimeFilterInput, EqualFilterBigNumberInput, EqualFilterStringInput, StringFilterInput,
    },
    map_filter,
    pagination::PaginationInput,
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::DraftStockRelocationLineNode;
use repository::{
    DatetimeFilter, EqualFilter, PaginationOption, StockRelocationFilter, StockRelocationSort,
    StockRelocationSortField, StockRelocationStatus, StringFilter,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    stock_relocation::query::StockRelocationDraftFilter,
};

use crate::types::{StockRelocationConnector, StockRelocationNode, StockRelocationNodeStatus};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::stock_relocation::StockRelocationSortField")]
pub enum StockRelocationSortFieldInput {
    CreatedDatetime,
    FinalisedDatetime,
    Status,
    StockMovementNumber,
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
    pub stock_movement_number: Option<EqualFilterBigNumberInput>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub username: Option<StringFilterInput>,
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
            require_central_standalone: false,
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
            require_central_standalone: false,
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

#[derive(InputObject)]
pub struct StockRelocationDraftLinesInput {
    pub from_location_id: Option<String>,
    pub item_id: Option<String>,
    pub stock_relocation_line_id: Option<String>,
}

pub fn get_stock_relocation_draft_lines(
    ctx: &Context<'_>,
    store_id: &str,
    input: StockRelocationDraftLinesInput,
) -> Result<Vec<DraftStockRelocationLineNode>> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStockLine,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let draft_lines = service_provider
        .stock_relocation_service
        .get_stock_relocation_draft_lines(
            &service_context,
            store_id,
            StockRelocationDraftFilter {
                from_location_id: input.from_location_id,
                item_id: input.item_id,
                stock_relocation_line_id: input.stock_relocation_line_id,
            },
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(DraftStockRelocationLineNode::from_vec(draft_lines))
}

impl StockRelocationFilterInput {
    pub fn to_domain(self) -> StockRelocationFilter {
        StockRelocationFilter {
            id: self.id.map(EqualFilter::from),
            store_id: self.store_id.map(EqualFilter::from),
            status: self
                .status
                .map(|t| map_filter!(t, StockRelocationStatus::from)),
            stock_movement_number: self.stock_movement_number.map(EqualFilter::from),
            created_datetime: self.created_datetime.map(DatetimeFilter::from),
            username: self.username.map(StringFilter::from),
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
