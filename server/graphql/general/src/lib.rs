mod mutations;
mod queries;

use self::queries::*;

use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use mutations::server_settings::{
    update_server_settings, UpdateServerSettingsInput, UpdateServerSettingsResponse,
};
use queries::{
    requisition_line_chart::{ConsumptionOptionsInput, StockEvolutionOptionsInput},
    server_settings::{get_server_settings, server_restart, RestartNode, ServerSettingsResponse},
};

#[derive(Default, Clone)]
pub struct GeneralQueries;

#[Object]
impl GeneralQueries {
    #[allow(non_snake_case)]
    pub async fn apiVersion(&self) -> String {
        "1.0".to_string()
    }

    /// Retrieves a new auth bearer and refresh token
    /// The refresh token is returned as a cookie
    pub async fn auth_token(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "UserName")] username: String,
        #[graphql(desc = "Password")] password: String,
    ) -> Result<AuthTokenResponse> {
        login(ctx, &username, &password).await
    }

    pub async fn logout(&self, ctx: &Context<'_>) -> Result<LogoutResponse> {
        logout(ctx)
    }

    /// Retrieves a new auth bearer and refresh token
    /// The refresh token is returned as a cookie
    pub async fn refresh_token(&self, ctx: &Context<'_>) -> RefreshTokenResponse {
        refresh_token(ctx)
    }

    pub async fn me(&self, ctx: &Context<'_>) -> Result<UserResponse> {
        me(ctx)
    }

    /// Query omSupply "name" entries
    pub async fn names(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<NameFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<NameSortInput>>,
    ) -> Result<NamesResponse> {
        get_names(ctx, store_id, page, filter, sort)
    }

    pub async fn store(&self, ctx: &Context<'_>, id: String) -> Result<StoreResponse> {
        get_store(ctx, &id)
    }

    pub async fn stores(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<StoreFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<StoreSortInput>>,
    ) -> Result<StoresResponse> {
        stores(ctx, page, filter, sort)
    }

    /// Query omSupply "master_lists" entries
    pub async fn master_lists(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<MasterListFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<MasterListSortInput>>,
    ) -> Result<MasterListsResponse> {
        master_lists(ctx, store_id, page, filter, sort)
    }

    /// Query omSupply "item" entries
    pub async fn items(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<ItemFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<ItemSortInput>>,
    ) -> Result<ItemsResponse> {
        items(ctx, store_id, page, filter, sort)
    }

    pub async fn invoice_counts(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Timezone offset")] timezone_offset: Option<i32>,
    ) -> Result<InvoiceCounts> {
        invoice_counts(ctx, store_id, timezone_offset)
    }

    pub async fn stock_counts(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Timezone offset")] timezone_offset: Option<i32>,
        #[graphql(desc = "Expiring soon threshold")] days_till_expired: Option<i32>,
    ) -> Result<StockCounts> {
        stock_counts(ctx, store_id, timezone_offset, days_till_expired)
    }

    pub async fn requisition_line_chart(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        request_requisition_line_id: String,
        consumption_options_input: Option<ConsumptionOptionsInput>,
        stock_evolution_options_input: Option<StockEvolutionOptionsInput>,
    ) -> Result<requisition_line_chart::ChartResponse> {
        requisition_line_chart::chart(
            ctx,
            &store_id,
            &request_requisition_line_id,
            consumption_options_input,
            stock_evolution_options_input,
        )
    }
}

#[derive(Default, Clone)]
pub struct ServerAdminQueries;

#[Object]
impl ServerAdminQueries {
    /// Retrieves a new auth bearer and refresh token
    /// The refresh token is returned as a cookie
    pub async fn server_settings(&self, ctx: &Context<'_>) -> Result<ServerSettingsResponse> {
        get_server_settings(ctx, false)
    }

    /// Restarts the server
    pub async fn server_restart(&self, ctx: &Context<'_>) -> Result<RestartNode> {
        server_restart(ctx, false).await
    }
}
#[derive(Default, Clone)]
pub struct ServerAdminMutations;

#[Object]
impl ServerAdminMutations {
    pub async fn update_server_settings(
        &self,
        ctx: &Context<'_>,
        input: UpdateServerSettingsInput,
    ) -> Result<UpdateServerSettingsResponse> {
        update_server_settings(ctx, input, false)
    }
}

/// No access control during init stage
#[derive(Default, Clone)]
pub struct ServerAdminStage0Queries;

#[Object]
impl ServerAdminStage0Queries {
    /// Retrieves a new auth bearer and refresh token
    /// The refresh token is returned as a cookie
    pub async fn server_settings(&self, ctx: &Context<'_>) -> Result<ServerSettingsResponse> {
        get_server_settings(ctx, true)
    }

    /// Restarts the server
    pub async fn server_restart(&self, ctx: &Context<'_>) -> Result<RestartNode> {
        server_restart(ctx, true).await
    }
}
/// No access control during init stage
#[derive(Default, Clone)]
pub struct ServerAdminStage0Mutations;

#[Object]
impl ServerAdminStage0Mutations {
    pub async fn update_server_settings(
        &self,
        ctx: &Context<'_>,
        input: UpdateServerSettingsInput,
    ) -> Result<UpdateServerSettingsResponse> {
        update_server_settings(ctx, input, true)
    }
}
