mod insert;
mod query;
pub use insert::*;
pub use query::*;
mod insert_reason;
pub use insert_reason::*;
mod query_reason;
pub use query_reason::*;
mod delete_reason;
pub use delete_reason::*;

use crate::types::AssetLogFilterInput;
use crate::types::AssetLogReasonFilterInput;
use crate::types::AssetLogReasonSortInput;
use crate::types::AssetLogReasonsResponse;
use crate::types::AssetLogSortInput;
use crate::types::AssetLogsResponse;
use async_graphql::*;
use graphql_core::pagination::PaginationInput;

#[derive(Default, Clone)]
pub struct AssetLogQueries;

#[Object]
impl AssetLogQueries {
    async fn asset_logs(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<AssetLogFilterInput>,
        sort: Option<Vec<AssetLogSortInput>>,
    ) -> Result<AssetLogsResponse> {
        asset_logs(ctx, store_id, page, filter, sort)
    }
}

#[derive(Default, Clone)]
pub struct AssetLogMutations;

#[Object]
impl AssetLogMutations {
    async fn insert_asset_log(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertAssetLogInput,
    ) -> Result<InsertAssetLogResponse> {
        insert_asset_log(ctx, &store_id, input)
    }
}

#[derive(Default, Clone)]
pub struct AssetLogReasonQueries;

#[Object]
impl AssetLogReasonQueries {
    async fn asset_log_reasons(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<AssetLogReasonFilterInput>,
        sort: Option<Vec<AssetLogReasonSortInput>>,
    ) -> Result<AssetLogReasonsResponse> {
        asset_log_reasons(ctx, store_id, page, filter, sort)
    }
}

#[derive(Default, Clone)]
pub struct AssetLogReasonMutations;

#[Object]
impl AssetLogReasonMutations {
    async fn insert_asset_log_reason(
        &self,
        ctx: &Context<'_>,
        input: InsertAssetLogReasonInput,
    ) -> Result<InsertAssetLogReasonResponse> {
        insert_asset_log_reason(ctx, input)
    }
    async fn delete_log_reason(
        &self,
        ctx: &Context<'_>,
        reason_id: String,
    ) -> Result<DeleteAssetLogReasonResponse> {
        delete_log_reason(ctx, &reason_id)
    }
}
