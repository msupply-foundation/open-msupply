use crate::types::{GoodsReceivedConnector, GoodsReceivedNode, GoodsReceivedNodeStatus};
use async_graphql::*;
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    pagination::PaginationInput,
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::goods_received::{GoodsReceivedFilter, GoodsReceivedSort, GoodsReceivedSortField};
use repository::{EqualFilter, PaginationOption};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::goods_received::GoodsReceivedSortField")]
pub enum GoodsReceivedSortFieldInput {
    CreatedDatetime,
    Number,
    Status,
    ReceivedDate,
}

#[derive(InputObject)]
pub struct GoodsReceivedSortInput {
    /// Sort query result by `key`
    key: GoodsReceivedSortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterGoodsReceivedStatusInput {
    pub equal_to: Option<GoodsReceivedNodeStatus>,
    pub equal_any: Option<Vec<GoodsReceivedNodeStatus>>,
    pub not_equal_to: Option<GoodsReceivedNodeStatus>,
    pub not_equal_all: Option<Vec<GoodsReceivedNodeStatus>>,
}

#[derive(InputObject, Clone)]
pub struct GoodsReceivedFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub status: Option<EqualFilterGoodsReceivedStatusInput>,
    pub purchase_order_id: Option<EqualFilterStringInput>,
}

#[derive(Union)]
pub enum GoodsReceivedListResponse {
    Response(GoodsReceivedConnector),
}

#[derive(Union)]
pub enum GoodsReceivedResponse {
    Error(RecordNotFound),
    Response(GoodsReceivedNode),
}

pub fn get_goods_received(
    ctx: &Context<'_>,
    store_id: &str,
    id: &str,
) -> Result<GoodsReceivedResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryGoodsReceived,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .goods_received_service
        .get_one_goods_received(&service_context, store_id, id)
        .map_err(StandardGraphqlError::from_repository_error)
    {
        Ok(order) => {
            let result = match order {
                Some(goods_received) => {
                    GoodsReceivedResponse::Response(GoodsReceivedNode::from_domain(goods_received))
                }
                None => GoodsReceivedResponse::Error(RecordNotFound {}),
            };
            Ok(result)
        }
        Err(err) => Err(err),
    }
}

pub fn get_goods_received_list(
    ctx: &Context<'_>,
    store_id: &str,
    page: Option<PaginationInput>,
    filter: Option<GoodsReceivedFilterInput>,
    sort: Option<Vec<GoodsReceivedSortInput>>,
) -> Result<GoodsReceivedListResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryGoodsReceived,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .goods_received_service
        .get_goods_received_list(
            &service_context,
            &store_id,
            page.map(PaginationOption::from),
            filter.map(|filter| filter.to_domain()),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(GoodsReceivedListResponse::Response(
        GoodsReceivedConnector::from_domain(result),
    ))
}

impl GoodsReceivedFilterInput {
    pub fn to_domain(self) -> GoodsReceivedFilter {
        GoodsReceivedFilter {
            id: self.id.map(EqualFilter::from),
            store_id: None, // This is mapped from the store_id param in the graphql
            purchase_order_id: self.purchase_order_id.map(EqualFilter::from),
        }
    }
}

impl GoodsReceivedSortInput {
    pub fn to_domain(self) -> GoodsReceivedSort {
        GoodsReceivedSort {
            key: GoodsReceivedSortField::from(self.key),
            desc: self.desc,
        }
    }
}
