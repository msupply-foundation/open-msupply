use async_graphql::{Context, Object, Result};
use graphql_core::pagination::PaginationInput;

pub mod mutations;
pub mod queries;
pub mod types;

use mutations::{insert_stock_relocation, InsertInput, InsertResponse};
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

#[derive(Default, Clone)]
pub struct StockRelocationMutations;

#[Object]
impl StockRelocationMutations {
    pub async fn insert_stock_relocation(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInput,
    ) -> Result<InsertResponse> {
        insert_stock_relocation(ctx, &store_id, input)
    }
}
