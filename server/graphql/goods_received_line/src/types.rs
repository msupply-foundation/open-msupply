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
