pub mod queries;

use async_graphql::*;
use graphql_types::types::VVMStatusesResponse;
use queries::vvm_status::active_vvm_statuses;

#[derive(Default, Clone)]
pub struct VVMQueries;

#[Object]
impl VVMQueries {
    pub async fn active_vvm_statuses(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<VVMStatusesResponse> {
        active_vvm_statuses(ctx, store_id)
    }
}
