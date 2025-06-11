use async_graphql::*;
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    pagination::PaginationInput,
    simple_generic_errors::RecordNotFound,
};
use graphql_types::types::{PurchaseOrderConnector, PurchaseOrderNode, PurchaseOrderRow};
use repository::mock::mock_store_a;
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
    _ctx: &Context<'_>,
    _store_id: &str,
    _id: &str,
) -> Result<PurchaseOrderResponse> {
    // TODO replace with actual service layer
    Ok(PurchaseOrderResponse::Response(PurchaseOrderNode {
        purchase_order: mock_purchase_order_a(),
    }))
}

pub fn get_purchase_orders(
    _ctx: &Context<'_>,
    _store_id: &str,
    _page: Option<PaginationInput>,
    _filter: Option<PurchaseOrderFilterInput>,
    _sort: Option<Vec<PurchaseOrderSortInput>>,
) -> Result<PurchaseOrdersResponse> {
    // TODO replace with actual service layer
    Ok(PurchaseOrdersResponse::Response(PurchaseOrderConnector {
        total_count: 2,
        nodes: vec![
            PurchaseOrderNode {
                purchase_order: mock_purchase_order_a(),
            },
            PurchaseOrderNode {
                purchase_order: mock_purchase_order_b(),
            },
        ],
    }))
}

// TODO move this into mocks
pub fn mock_purchase_order_a() -> PurchaseOrderRow {
    inline_init(|r: &mut PurchaseOrderRow| {
        r.id = "test_purchase_order_a".to_string();
        r.store_id = mock_store_a().id;
        r.status = Some("mock_status".to_string());
    })
}

pub fn mock_purchase_order_b() -> PurchaseOrderRow {
    inline_init(|r: &mut PurchaseOrderRow| {
        r.id = "test_purchase_order_b".to_string();
        r.store_id = mock_store_a().id;
        r.status = Some("mock_status".to_string());
    })
}
