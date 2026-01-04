use async_graphql::*;
use graphql_core::{
    generic_filters::{
        DateFilterInput, DatetimeFilterInput, EqualFilterStringInput, StringFilterInput,
    },
    map_filter,
    pagination::PaginationInput,
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{PurchaseOrderConnector, PurchaseOrderNode, PurchaseOrderNodeStatus};
use repository::{
    DateFilter, DatetimeFilter, EqualFilter, PaginationOption, PurchaseOrderStatus, StringFilter,
};
use repository::{PurchaseOrderFilter, PurchaseOrderSort, PurchaseOrderSortField};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::purchase_order::PurchaseOrderSortField")]
pub enum PurchaseOrderSortFieldInput {
    Number,
    CreatedDatetime,
    Status,
    TargetMonths,
}

#[derive(InputObject)]
pub struct PurchaseOrderSortInput {
    /// Sort query result by `key`
    key: PurchaseOrderSortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterPurchaseOrderStatusInput {
    pub equal_to: Option<PurchaseOrderNodeStatus>,
    pub equal_any: Option<Vec<PurchaseOrderNodeStatus>>,
    pub not_equal_to: Option<PurchaseOrderNodeStatus>,
    pub not_equal_all: Option<Vec<PurchaseOrderNodeStatus>>,
}

#[derive(InputObject, Clone)]
pub struct PurchaseOrderFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub status: Option<EqualFilterPurchaseOrderStatusInput>,
    pub supplier: Option<StringFilterInput>,
    pub store_id: Option<EqualFilterStringInput>,
    pub confirmed_datetime: Option<DatetimeFilterInput>,
    pub requested_delivery_date: Option<DateFilterInput>,
    pub sent_datetime: Option<DatetimeFilterInput>,
}

#[derive(Union)]
pub enum PurchaseOrdersResponse {
    Response(PurchaseOrderConnector),
}

#[derive(Union)]
pub enum PurchaseOrderResponse {
    Error(RecordNotFound),
    Response(PurchaseOrderNode),
}

pub fn get_purchase_order(
    ctx: &Context<'_>,
    store_id: &str,
    id: &str,
) -> Result<PurchaseOrderResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPurchaseOrder,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .purchase_order_service
        .get_purchase_order(&service_context, Some(&store_id), id)
        .map_err(StandardGraphqlError::from_repository_error)
    {
        Ok(order) => {
            let result = match order {
                Some(purchase_order) => {
                    PurchaseOrderResponse::Response(PurchaseOrderNode::from_domain(purchase_order))
                }
                None => PurchaseOrderResponse::Error(RecordNotFound {}),
            };
            Ok(result)
        }
        Err(err) => Err(err),
    }
}

pub fn get_purchase_orders(
    ctx: &Context<'_>,
    store_id: &str,
    page: Option<PaginationInput>,
    filter: Option<PurchaseOrderFilterInput>,
    sort: Option<Vec<PurchaseOrderSortInput>>,
) -> Result<PurchaseOrdersResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPurchaseOrder,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .purchase_order_service
        .get_purchase_orders(
            &service_context,
            Some(&store_id),
            page.map(PaginationOption::from),
            filter.map(|filter| filter.to_domain()),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(PurchaseOrdersResponse::Response(
        PurchaseOrderConnector::from_domain(result),
    ))
}

impl PurchaseOrderFilterInput {
    pub fn to_domain(self) -> PurchaseOrderFilter {
        PurchaseOrderFilter {
            id: self.id.map(EqualFilter::from),
            status: self
                .status
                .map(|t| map_filter!(t, |s| PurchaseOrderStatus::from(s))),
            supplier: self.supplier.map(StringFilter::from),
            store_id: self.store_id.map(EqualFilter::from),
            created_datetime: self.created_datetime.map(DatetimeFilter::from),
            confirmed_datetime: self.confirmed_datetime.map(DatetimeFilter::from),
            requested_delivery_date: self.requested_delivery_date.map(DateFilter::from),
            sent_datetime: self.sent_datetime.map(DatetimeFilter::from),
        }
    }
}

impl PurchaseOrderSortInput {
    pub fn to_domain(self) -> PurchaseOrderSort {
        PurchaseOrderSort {
            key: PurchaseOrderSortField::from(self.key),
            desc: self.desc,
        }
    }
}
