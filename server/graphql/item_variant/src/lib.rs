use async_graphql::*;

mod mutations;
use self::mutations::*;

#[derive(Default, Clone)]
pub struct ItemVariantMutations;

#[Object]
impl ItemVariantMutations {
    async fn upsert_item_variant(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpsertItemVariantInput,
    ) -> Result<UpsertItemVariantResponse> {
        upsert_item_variant(ctx, store_id, input)
    }

    async fn delete_item_variant(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteItemVariantInput,
    ) -> Result<DeleteItemVariantResponse> {
        delete_item_variant(ctx, store_id, input)
    }
}
