use async_graphql::{Context, Object, Result};
use graphql_core::pagination::PaginationInput;

pub mod query;
pub mod types;

use query::*;

#[derive(Default, Clone)]
pub struct SyncMessageQueries;

#[Object]
impl SyncMessageQueries {
    pub async fn sync_message(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<SyncMessageResponse, async_graphql::Error> {
        get_sync_message(ctx, &store_id, &id)
    }

    pub async fn sync_messages_for_store(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<SyncMessageFilterInput>,
        sort: Option<Vec<SyncMessageSortInput>>,
    ) -> Result<SyncMessageListResponse, async_graphql::Error> {
        get_sync_messages(ctx, &store_id, page, filter, sort)
    }
}
