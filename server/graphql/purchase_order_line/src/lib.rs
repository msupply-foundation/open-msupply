mod purchase_order_line_queries;
use async_graphql::{Context, Object, Result};
use graphql_core::pagination::PaginationInput;

use purchase_order_line_queries::*;

#[derive(Default, Clone)]
pub struct PurchaseOrderLineQueries;

#[Object]
impl PurchaseOrderLineQueries {
    pub async fn purchase_order_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<PurchaseOrderLineResponse, async_graphql::Error> {
        get_purchase_order_line(ctx, &store_id, &id)
    }

    pub async fn purchase_order_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<PurchaseOrderLineFilterInput>,
        sort: Option<Vec<PurchaseOrderLineSortInput>>,
    ) -> Result<PurchaseOrderLinesResponse, async_graphql::Error> {
        get_purchase_order_lines(ctx, &store_id, page, filter, sort)
    }
}
