pub mod mutations;
use async_graphql::*;
use mutations::{CreateInventoryAdjustmentInput, InsertResponse, create_inventory_adjustment};

#[derive(Default, Clone)]
pub struct InventoryAdjustmentMutations;

#[Object]
impl InventoryAdjustmentMutations {
    async fn create_inventory_adjustment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: CreateInventoryAdjustmentInput,
    ) -> Result<InsertResponse> {
        create_inventory_adjustment(ctx, &store_id, input)
    }
}
