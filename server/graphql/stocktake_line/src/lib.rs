pub mod mutations;
use async_graphql::Context;
use async_graphql::*;

use self::mutations::{delete::*, insert::*, update::*};
#[derive(Default, Clone)]
pub struct StocktakeLineMutations;

#[Object]
impl StocktakeLineMutations {
    async fn insert_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertStocktakeLineInput,
    ) -> Result<InsertStocktakeLineResponse> {
        insert_stocktake_line(ctx, &store_id, input)
    }

    async fn update_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateStocktakeLineInput,
    ) -> Result<UpdateStocktakeLineResponse> {
        update_stocktake_line(ctx, &store_id, input)
    }

    async fn delete_stocktake_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteStocktakeLineInput,
    ) -> Result<DeleteStocktakeLineResponse> {
        delete_stocktake_line(ctx, &store_id, input)
    }
}
