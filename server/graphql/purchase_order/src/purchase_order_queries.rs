use async_graphql::*;
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    pagination::PaginationInput,
    simple_generic_errors::{ErrorWrapper, NodeErrorInterface, RecordNotFound},
    standard_graphql_error::StandardGraphqlError,
};
use graphql_types::types::{PurchaseOrderConnector, PurchaseOrderNode};
use repository::{mock::mock_store_a, PurchaseOrderRow};
use util::inline_init;

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum PurchaseOrderSortFieldInput {
    Supplier,
    Number,
    CreatedDatetime,
    ConfirmedDatetime,
    Status,
    TargetMonths,
    DeliveryDate,
    Lines,
}

#[derive(InputObject)]
pub struct PurchaseOrderSortInput {
    /// Sort query result by `key`
    key: PurchaseOrderSortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct PurchaseOrderFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub created_datetime: Option<DatetimeFilterInput>,
    pub status: Option<EqualFilterStringInput>,
    pub supplier: Option<EqualFilterStringInput>,
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
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .purchase_order_service
        .get_purchase_order(&contexdt, &store_id, &id)
        .map_err(StandardGraphqlError::from_repository_error)
    {
        Ok(order) => {
            let result = match puchase_order {
                Some(purchase_order) => {
                    PurchaseOrderResponse::Response(PurchaseOrderNode::from_domain(purchase_order))
                }
                None => PurchaseOrderResponse::Error(ErrorWrapper {
                    error: NodeErrorInterface::RecordNotFound(RecordNotFound {}),
                }),
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
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let resul = service_provider
        .purchase_order_service
        .get_purchase_orders(&contexdt, &store_id, page, filter, sort)
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(PurchaseOrdersResponse::Response(
        PurchaseOrderConnector::from_domain(list_result),
    ))
}
