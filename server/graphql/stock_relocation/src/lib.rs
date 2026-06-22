use async_graphql::{Context, ErrorExtensions, Object, Result};
use graphql_core::{
    pagination::PaginationInput, standard_graphql_error::StandardGraphqlError, ContextExt,
};

pub mod mutations;
pub mod queries;
pub mod types;

/// Feature flag gating the stock movement (stock relocation) feature.
/// Matches the `stock_movement` key under `features` in the server config
/// (see also the client `useFeatureFlags` hook).
const STOCK_MOVEMENT_FEATURE: &str = "stock_movement";

/// Returns an error unless the stock movement feature is enabled in server settings.
fn check_stock_movement_enabled(ctx: &Context<'_>) -> Result<()> {
    let enabled = ctx
        .get_settings()
        .features
        .as_ref()
        .and_then(|features| features.get(STOCK_MOVEMENT_FEATURE).copied())
        .unwrap_or(false);

    if enabled {
        Ok(())
    } else {
        Err(StandardGraphqlError::Forbidden(
            "Stock movement feature is not enabled".to_string(),
        )
        .extend())
    }
}

use mutations::{
    delete_stock_relocation, insert_stock_relocation, update_stock_relocation, DeleteInput,
    DeleteStockRelocationResponse, InsertInput, InsertResponse, UpdateInput, UpdateResponse,
};
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
        check_stock_movement_enabled(ctx)?;
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
        check_stock_movement_enabled(ctx)?;
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
        check_stock_movement_enabled(ctx)?;
        insert_stock_relocation(ctx, &store_id, input)
    }

    pub async fn update_stock_relocation(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateInput,
    ) -> Result<UpdateResponse> {
        check_stock_movement_enabled(ctx)?;
        update_stock_relocation(ctx, &store_id, input)
    }

    pub async fn delete_stock_relocation(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteInput,
    ) -> Result<DeleteStockRelocationResponse> {
        check_stock_movement_enabled(ctx)?;
        delete_stock_relocation(ctx, &store_id, input)
    }
}
