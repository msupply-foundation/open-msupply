use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    pagination::PaginationInput,
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{PurchaseOrderLineConnector, PurchaseOrderLineNode};
use repository::{
    EqualFilter, PaginationOption, PurchaseOrderLineFilter, PurchaseOrderLineSort,
    PurchaseOrderLineSortField,
};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
#[graphql(remote = "repository::db_diesel::purchase_order_line::PurchaseOrderLineSortField")]
pub enum PurchaseOrderLineSortFieldInput {
    ItemName,
    LineNumber,
    RequestedDeliveryDate,
    ExpectedDeliveryDate,
}

#[derive(InputObject)]
pub struct PurchaseOrderLineSortInput {
    /// Sort query result by `key`
    key: PurchaseOrderLineSortFieldInput,
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct PurchaseOrderLineFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub purchase_order_id: Option<EqualFilterStringInput>,
}

#[derive(Union)]
pub enum PurchaseOrderLinesResponse {
    Response(PurchaseOrderLineConnector),
}

#[derive(Union)]
pub enum PurchaseOrderLineResponse {
    Error(RecordNotFound),
    Response(PurchaseOrderLineNode),
}

pub fn get_purchase_order_line(
    ctx: &Context<'_>,
    store_id: &str,
    id: &str,
) -> Result<PurchaseOrderLineResponse> {
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
        .purchase_order_line_service
        .get_purchase_order_line(&service_context, Some(&store_id), id)
        .map_err(StandardGraphqlError::from_repository_error)
    {
        Ok(line) => {
            let result = match line {
                Some(purchase_order_line) => PurchaseOrderLineResponse::Response(
                    PurchaseOrderLineNode::from_domain(purchase_order_line),
                ),
                None => PurchaseOrderLineResponse::Error(RecordNotFound {}),
            };
            Ok(result)
        }
        Err(err) => Err(err),
    }
}

pub fn get_purchase_order_lines(
    ctx: &Context<'_>,
    store_id: &str,
    page: Option<PaginationInput>,
    filter: Option<PurchaseOrderLineFilterInput>,
    sort: Option<Vec<PurchaseOrderLineSortInput>>,
) -> Result<PurchaseOrderLinesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryPurchaseOrder,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let list_result = service_provider
        .purchase_order_line_service
        .get_purchase_order_lines(
            &service_context,
            Some(&store_id),
            page.map(PaginationOption::from),
            filter.map(|filter| filter.to_domain()),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(PurchaseOrderLinesResponse::Response(
        PurchaseOrderLineConnector::from_domain(list_result),
    ))
}

impl PurchaseOrderLineFilterInput {
    pub fn to_domain(self) -> PurchaseOrderLineFilter {
        PurchaseOrderLineFilter {
            id: self.id.map(EqualFilter::from),
            purchase_order_id: self.purchase_order_id.map(EqualFilter::from),
            store_id: None,
            requested_pack_size: None,
            item_id: None,
        }
    }
}

impl PurchaseOrderLineSortInput {
    pub fn to_domain(self) -> PurchaseOrderLineSort {
        PurchaseOrderLineSort {
            key: PurchaseOrderLineSortField::from(self.key),
            desc: self.desc,
        }
    }
}
