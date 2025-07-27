use async_graphql::*;
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput, StringFilterInput},
    map_filter,
    pagination::PaginationInput,
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use graphql_types::types::{PurchaseOrderConnector, PurchaseOrderNode, PurchaseOrderNodeStatus};
use repository::{DatetimeFilter, EqualFilter, PaginationOption, StringFilter};
use repository::{PurchaseOrderFilter, PurchaseOrderSort, PurchaseOrderSortField};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum PurchaseOrderSortFieldInput {
    Number,
    CreatedDatetime,
    Status,
    TargetMonths,
    DeliveryDate,
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
}

#[derive(InputObject, Clone)]
pub struct PurchaseOrderFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub status: Option<EqualFilterPurchaseOrderStatusInput>,
    pub supplier: Option<StringFilterInput>,
    pub store_id: Option<EqualFilterStringInput>,
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
    // TODO add auth validation once permissions finalised
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), "".to_string())?;

    match service_provider
        .purchase_order_service
        .get_purchase_order(&service_context, &store_id, id)
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
    // TODO add auth validation once permissions finalised
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), "".to_string())?;

    let result = service_provider
        .purchase_order_service
        .get_purchase_orders(
            &service_context,
            &store_id,
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
            created_datetime: self.created_datetime.map(DatetimeFilter::from),
            status: self
                .status
                .map(|t| map_filter!(t, PurchaseOrderNodeStatus::to_domain)),
            supplier: self.supplier.map(StringFilter::from),
            store_id: self.store_id.map(EqualFilter::from),
        }
    }
}

impl PurchaseOrderSortInput {
    pub fn to_domain(self) -> PurchaseOrderSort {
        use PurchaseOrderSortField as to;
        use PurchaseOrderSortFieldInput as from;
        let key = match self.key {
            from::Number => to::Number,
            from::TargetMonths => to::TargetMonths,
            from::DeliveryDate => to::ExpectedDeliveryDate,
            from::Status => to::Status,
            from::CreatedDatetime => to::CreatedDatetime,
        };

        PurchaseOrderSort {
            key,
            desc: self.desc,
        }
    }
}
