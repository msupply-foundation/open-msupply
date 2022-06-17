pub mod mutations;
mod stocktake_queries;
use self::stocktake_queries::*;
use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_types::types::StocktakeNode;

#[derive(Default, Clone)]
pub struct StocktakeQueries;

#[Object]
impl StocktakeQueries {
    pub async fn stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<StocktakeNode> {
        stocktake(ctx, &store_id, &id)
    }

    pub async fn stocktake_by_number(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        stocktake_number: i64,
    ) -> Result<StocktakeNode> {
        stocktake_by_number(ctx, &store_id, stocktake_number)
    }

    pub async fn stocktakes(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<StocktakeFilterInput>,
        sort: Option<Vec<StocktakeSortInput>>,
    ) -> Result<StocktakesResponse> {
        stocktakes(ctx, &store_id, page, filter, sort)
    }
}

#[derive(Default, Clone)]
pub struct StocktakeMutations;

#[Object]
impl StocktakeMutations {
    async fn insert_stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: mutations::InsertInput,
    ) -> Result<mutations::InsertResponse> {
        mutations::insert(ctx, &store_id, input)
    }

    async fn update_stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: mutations::UpdateInput,
    ) -> Result<mutations::UpdateResponse> {
        mutations::update(ctx, &store_id, input)
    }

    async fn delete_stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: mutations::DeleteInput,
    ) -> Result<mutations::DeleteResponse> {
        mutations::delete(ctx, &store_id, input)
    }
}
