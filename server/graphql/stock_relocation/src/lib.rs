use async_graphql::{Context, Object, Result};
use graphql_core::pagination::PaginationInput;

pub mod queries;
pub mod types;

use queries::{
    get_stock_relocation, get_stock_relocations, StockRelocationFilterInput,
    StockRelocationResponse, StockRelocationSortInput, StockRelocationsResponse,
};

#[derive(Default, Clone)]
pub struct StockRelocationQueries;

#[Object]
impl StockRelocationQueries {
    pub async fn stock_relocation(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<StockRelocationResponse> {
        get_stock_relocation(ctx, &store_id, &id)
    }

    pub async fn stock_relocations(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<StockRelocationFilterInput>,
        sort: Option<Vec<StockRelocationSortInput>>,
    ) -> Result<StockRelocationsResponse> {
        get_stock_relocations(ctx, &store_id, page, filter, sort)
    }
}
