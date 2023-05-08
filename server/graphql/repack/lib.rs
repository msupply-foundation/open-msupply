pub mod mutations;
use async_graphql::*;
use mutations::{insert_repack, InsertRepackInput, InsertResponse};

#[derive(Default, Clone)]
pub struct RepackMutations;

#[Object]
impl RepackMutations {
    async fn insert_repack(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertRepackInput,
    ) -> Result<InsertResponse> {
        insert_repack(ctx, &store_id, input)
    }
}
