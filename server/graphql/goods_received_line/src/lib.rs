mod query;
pub mod types;
use async_graphql::{Context, Object, Result};
use graphql_core::pagination::PaginationInput;

use query::*;

#[derive(Default, Clone)]
pub struct GoodsReceivedLineQueries;

#[Object]
impl GoodsReceivedLineQueries {
    pub async fn goods_received_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<GoodsReceivedLineResponse, async_graphql::Error> {
        get_goods_received_line(ctx, &store_id, &id)
    }

    pub async fn goods_received_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<GoodsReceivedLineFilterInput>,
        sort: Option<Vec<GoodsReceivedLineSortInput>>,
    ) -> Result<GoodsReceivedLinesResponse, async_graphql::Error> {
        get_goods_received_lines(ctx, &store_id, page, filter, sort)
    }
}