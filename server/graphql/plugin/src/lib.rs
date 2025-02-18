mod mutations;
pub mod plugin_data;
mod queries;
pub mod types;

use async_graphql::*;
use plugin_data::query::{PluginDataFilterInput, PluginDataResponse, PluginDataSortInput};
use queries::uploaded_info::PluginInfoNode;

#[derive(Default, Clone)]
pub struct PluginQueries;

#[Object]
impl PluginQueries {
    async fn plugin_data(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        plugin_code: String,
        filter: Option<PluginDataFilterInput>,
        sort: Option<Vec<PluginDataSortInput>>,
    ) -> Result<PluginDataResponse> {
        plugin_data::query::get_plugin_data(ctx, &store_id, &plugin_code, filter, sort)
    }
}

#[derive(Default, Clone)]
pub struct CentralPluginQueries;
#[Object]
impl CentralPluginQueries {
    async fn uploaded_plugin_info(
        &self,
        ctx: &Context<'_>,
        file_id: String,
    ) -> Result<queries::uploaded_info::UploadedPluginInfoResponse> {
        queries::uploaded_info::uploaded_plugin_info(ctx, file_id)
    }
}

#[derive(Default, Clone)]
pub struct CentralPluginMutations;
#[Object]
impl CentralPluginMutations {
    async fn install_uploaded_plugin(
        &self,
        ctx: &Context<'_>,
        file_id: String,
    ) -> Result<PluginInfoNode> {
        mutations::install::install_uploaded_plugin(ctx, file_id)
    }
}

#[derive(Default, Clone)]
pub struct PluginMutations;

#[Object]
impl PluginMutations {
    async fn insert_plugin_data(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: plugin_data::mutations::insert::InsertPluginDataInput,
    ) -> Result<plugin_data::mutations::insert::InsertResponse> {
        plugin_data::mutations::insert::insert_plugin_data(ctx, &store_id, input)
    }

    async fn update_plugin_data(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: plugin_data::mutations::update::UpdatePluginDataInput,
    ) -> Result<plugin_data::mutations::update::UpdateResponse> {
        plugin_data::mutations::update::update_plugin_data(ctx, &store_id, input)
    }
}
