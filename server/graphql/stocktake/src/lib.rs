pub mod mutations;
mod stocktake_queries;
use self::mutations::{delete::*, insert::*, update::*};
use self::stocktake_queries::*;
use async_graphql::*;
use graphql_core::pagination::PaginationInput;

#[derive(Default, Clone)]
pub struct StocktakeQueries;

#[Object]
impl StocktakeQueries {
    pub async fn stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<StocktakeResponse> {
        stocktake(ctx, &store_id, &id)
    }

    pub async fn stocktake_by_number(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        stocktake_number: i64,
    ) -> Result<StocktakeResponse> {
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
        input: InsertStocktakeInput,
    ) -> Result<InsertStocktakeResponse> {
        insert_stocktake(ctx, &store_id, input)
    }

    async fn update_stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateStocktakeInput,
    ) -> Result<UpdateStocktakeResponse> {
        update_stocktake(ctx, &store_id, input)
    }

    async fn delete_stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteStocktakeInput,
    ) -> Result<DeleteStocktakeResponse> {
        delete_stocktake(ctx, &store_id, input)
    }
}
