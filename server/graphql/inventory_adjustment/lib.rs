pub mod mutations;
use async_graphql::*;
use mutations::{create_inventory_adjustment, CreateInventoryAdjustmentInput, InsertResponse};

// #[derive(Default, Clone)]
// pub struct InventoryAdjustmentQueries;

// #[Object]
// impl InventoryAdjustmentQueries {
// pub async fn inventory_adjustment(
//     &self,
//     ctx: &Context<'_>,
//     store_id: String,
//     invoice_id: String,
// ) -> Result<InventoryAdjustmentResponse> {
//     inventory_adjustment(ctx, store_id, &invoice_id).await
// }
// }

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
