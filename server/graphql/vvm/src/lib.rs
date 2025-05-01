pub mod types;
pub mod queries;

use async_graphql::*;
use queries::vvm_status::active_vvm_statuses;
use types::vvm_status::VVMStatusesResponse;

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