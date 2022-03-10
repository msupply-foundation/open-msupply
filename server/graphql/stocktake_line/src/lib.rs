pub mod mutations;
use async_graphql::Context;
use async_graphql::*;

#[derive(Default, Clone)]
pub struct StocktakeLineMutations;

#[Object]
impl StocktakeLineMutations {
    async fn insert_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: mutations::InsertInput,
    ) -> Result<mutations::InsertResponse> {
        mutations::insert(ctx, &store_id, input)
    }

    async fn update_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: mutations::UpdateInput,
    ) -> Result<mutations::UpdateResponse> {
        mutations::update(ctx, &store_id, input)
    }

    async fn delete_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: mutations::DeleteInput,
    ) -> Result<mutations::DeleteResponse> {
        mutations::delete(ctx, &store_id, input)
    }
}
