use async_graphql::*;
use queries::{
    vvm_status::active_vvm_statuses, vvm_status_log::get_vvm_status_log_by_stock_line_id,
};
use types::{vvm_status::VVMStatusesResponse, vvm_status_log::VVMStatusLogResponse};

pub mod queries;
pub mod types;

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

    pub async fn get_vvm_status_log_by_stock_line_id(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        stock_line_id: String,
    ) -> Result<VVMStatusLogResponse> {
        get_vvm_status_log_by_stock_line_id(ctx, store_id, &stock_line_id)
    }
}
