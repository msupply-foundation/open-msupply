use async_graphql::*;

mod mutations;
use self::mutations::*;

#[derive(Default, Clone)]
pub struct AncillaryItemMutations;

#[Object]
impl AncillaryItemMutations {
    async fn upsert_ancillary_item(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpsertAncillaryItemInput,
    ) -> Result<UpsertAncillaryItemResponse> {
        upsert_ancillary_item(ctx, store_id, input)
    }

    async fn delete_ancillary_item(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteAncillaryItemInput,
    ) -> Result<DeleteAncillaryItemResponse> {
        delete_ancillary_item(ctx, store_id, input)
    }

    /// Sets an item's own wastage rate (%) as an ancillary supply, returning the rate saved
    async fn set_supply_wastage_rate(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: SetSupplyWastageRateInput,
    ) -> Result<f64> {
        set_supply_wastage_rate(ctx, store_id, input)
    }
}
