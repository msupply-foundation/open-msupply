use async_graphql::{Context, Object, Result};
use graphql_core::pagination::PaginationInput;

pub mod mutations;
pub mod queries;
pub mod types;

use graphql_types::types::DraftStockRelocationLineNode;

use mutations::{
    delete_stock_relocation, delete_stock_relocations, insert_stock_relocation,
    update_stock_relocation, DeleteInput, DeleteResponses, DeleteStockRelocationResponse,
    InsertInput, InsertResponse, UpdateInput, UpdateResponse,
};
use queries::{
    get_stock_relocation, get_stock_relocation_draft_lines, get_stock_relocations,
    StockRelocationDraftLinesInput, StockRelocationFilterInput, StockRelocationResponse,
    StockRelocationSortInput, StockRelocationsResponse,
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

    pub async fn stock_relocation_draft_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: StockRelocationDraftLinesInput,
    ) -> Result<Vec<DraftStockRelocationLineNode>> {
        get_stock_relocation_draft_lines(ctx, &store_id, input)
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

    pub async fn update_stock_relocation(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateInput,
    ) -> Result<UpdateResponse> {
        update_stock_relocation(ctx, &store_id, input)
    }

    pub async fn delete_stock_relocation(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteInput,
    ) -> Result<DeleteStockRelocationResponse> {
        delete_stock_relocation(ctx, &store_id, input)
    }

    pub async fn delete_stock_relocations(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        ids: Vec<String>,
    ) -> Result<DeleteResponses> {
        delete_stock_relocations(ctx, &store_id, ids)
    }
}
