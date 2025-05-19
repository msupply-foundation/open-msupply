use async_graphql::*;
use graphql_types::types::{VVMStatusLogResponse, VVMStatusesResponse};
use mutations::vvm_status_log::{
    insert::{insert, InsertInput, InsertResponse},
    update::{update_vvm_status_log, UpdateVVMStatusResponse},
};
use queries::{
    active_vvm_statuses::active_vvm_statuses, vvm_status_log::get_vvm_status_log_by_stock_line,
};

pub mod mutations;
pub mod queries;

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

    pub async fn get_vvm_status_log_by_stock_line(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        stock_line_id: String,
    ) -> Result<VVMStatusLogResponse> {
        get_vvm_status_log_by_stock_line(ctx, store_id, &stock_line_id)
    }
}

#[derive(Default, Clone)]
pub struct VVMMutations;

#[Object]
impl VVMMutations {
    pub async fn insert_vvm_status_log(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInput,
    ) -> Result<InsertResponse> {
        insert(ctx, &store_id, input)
    }

    pub async fn update_vvm_status_log(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: mutations::vvm_status_log::update::UpdateVVMStatusLogInput,
    ) -> Result<UpdateVVMStatusResponse> {
        update_vvm_status_log(ctx, &store_id, input)
    }
}
