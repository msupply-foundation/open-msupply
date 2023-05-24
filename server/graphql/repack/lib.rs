pub mod mutations;
pub mod query;
use async_graphql::*;
use graphql_types::types::RepackConnector;
use mutations::{insert_repack, InsertRepackInput, InsertResponse};
use query::{get_repack, get_repacks_by_stock_line, RepackResponse};

#[derive(Default, Clone)]
pub struct RepackQueries;

#[Object]
impl RepackQueries {
    pub async fn repack(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        invoice_id: String,
    ) -> Result<RepackResponse> {
        get_repack(ctx, store_id, &invoice_id).await
    }

    pub async fn repacks_by_stock_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        stock_line_id: String,
    ) -> Result<RepackConnector> {
        get_repacks_by_stock_line(ctx, store_id, &stock_line_id).await
    }
}

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
