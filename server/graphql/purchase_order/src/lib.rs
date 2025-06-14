pub mod purchase_order_queries;
use async_graphql::{Context, Object, Result};
use graphql_core::pagination::PaginationInput;

use purchase_order_queries::*;

#[derive(Default, Clone)]
pub struct PurchaseOrderQueries;

#[Object]
impl PurchaseOrderQueries {
    pub async fn purchase_order(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<PurchaseOrderResponse, async_graphql::Error> {
        get_purchase_order(ctx, &store_id, &id)
    }

    pub async fn purchase_orders(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<PurchaseOrderFilterInput>,
        sort: Option<Vec<PurchaseOrderSortInput>>,
    ) -> Result<PurchaseOrdersResponse, async_graphql::Error> {
        get_purchase_orders(ctx, &store_id, page, filter, sort)
    }
}
