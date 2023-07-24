pub mod mutations;
use async_graphql::Context;
use async_graphql::*;
use mutations::{delete::*, insert::*, update::*};

#[derive(Default, Clone)]
pub struct StocktakeLineMutations;

#[Object]
impl StocktakeLineMutations {
    async fn insert_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInput,
    ) -> Result<InsertResponse> {
        insert(ctx, &store_id, input)
    }

    async fn update_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateInput,
    ) -> Result<UpdateResponse> {
        update(ctx, &store_id, input)
    }

    async fn delete_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteInput,
    ) -> Result<DeleteResponse> {
        delete(ctx, &store_id, input)
    }
}
