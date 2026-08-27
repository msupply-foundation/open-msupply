use async_graphql::*;

mod mutations;
use self::mutations::*;

#[derive(Default, Clone)]
pub struct BundledItemMutations;

#[Object]
impl BundledItemMutations {
    async fn upsert_bundled_item(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpsertBundledItemInput,
    ) -> Result<UpsertBundledItemResponse> {
        upsert_bundled_item(ctx, store_id, input)
    }

    async fn delete_bundled_item(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteBundledItemInput,
    ) -> Result<DeleteBundledItemResponse> {
        delete_bundled_item(ctx, store_id, input)
    }
}
