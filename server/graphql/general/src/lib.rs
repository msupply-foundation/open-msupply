mod mutations;
mod queries;
mod sync_api_error;

pub use self::queries::sync_status::*;
use self::queries::*;

use chrono::{DateTime, Utc};
use graphql_core::pagination::PaginationInput;

use crate::store_preference::store_preferences;
use graphql_types::types::{
    CurrenciesResponse, CurrencyFilterInput, CurrencySortInput, StorePreferenceNode,
    TemperatureLogFilterInput,
};
use mutations::{
    barcode::{insert_barcode, BarcodeInput},
    common::SyncSettingsInput,
    display_settings::{
        update_display_settings, DisplaySettingsInput, UpdateDisplaySettingsResponse,
    },
    initialise_site::{initialise_site, InitialiseSiteResponse},
    log::{update_log_level, LogLevelInput, UpsertLogLevelResponse},
    manual_sync::manual_sync,
    sync_settings::{update_sync_settings, UpdateSyncSettingsResponse},
    update_user,
};
use queries::{
    currency::currencies,
    display_settings::{display_settings, DisplaySettingsHash, DisplaySettingsNode},
    initialisation_status::{initialisation_status, InitialisationStatusNode},
    requisition_line_chart::{ConsumptionOptionsInput, StockEvolutionOptionsInput},
    sync_settings::{sync_settings, SyncSettingsNode},
};

#[derive(Default, Clone)]
pub struct GeneralQueries;

#[Object]
impl GeneralQueries {
    #[allow(non_snake_case)]
    pub async fn apiVersion(&self) -> String {
        env!("CARGO_PKG_VERSION").to_string()
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

    pub async fn activity_logs(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<ActivityLogFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<ActivityLogSortInput>>,
    ) -> Result<ActivityLogResponse> {
        activity_logs(ctx, page, filter, sort)
    }

    /// Available without authorisation in operational and initialisation states
    pub async fn initialisation_status(
        &self,
        ctx: &Context<'_>,
    ) -> Result<InitialisationStatusNode> {
        initialisation_status(ctx)
    }

    pub async fn latest_sync_status(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<FullSyncStatusNode>> {
        latest_sync_status(ctx, true)
    }

    pub async fn number_of_records_in_push_queue(&self, ctx: &Context<'_>) -> Result<u64> {
        number_of_records_in_push_queue(ctx)
    }

    pub async fn sync_settings(&self, ctx: &Context<'_>) -> Result<Option<SyncSettingsNode>> {
        sync_settings(ctx, true)
    }

    pub async fn display_settings(
        &self,
        ctx: &Context<'_>,
        input: DisplaySettingsHash,
    ) -> Result<DisplaySettingsNode> {
        display_settings(ctx, input)
    }

    pub async fn response_requisition_stats(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        requisition_line_id: String,
    ) -> Result<RequisitionStatsResponse> {
        response_requisition_stats(ctx, &store_id, &requisition_line_id)
    }

    pub async fn inventory_adjustment_reasons(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<InventoryAdjustmentReasonFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<InventoryAdjustmentReasonSortInput>>,
    ) -> Result<InventoryAdjustmentReasonResponse> {
        inventory_adjustment_reasons(ctx, page, filter, sort)
    }

    pub async fn item_counts(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Low stock threshold in months")] low_stock_threshold: Option<i32>,
    ) -> Result<ItemCounts> {
        item_counts(ctx, store_id, low_stock_threshold)
    }

    pub async fn store_preferences(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<StorePreferenceNode> {
        store_preferences(ctx, &store_id)
    }

    pub async fn barcode_by_gtin(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        gtin: String,
    ) -> Result<BarcodeResponse> {
        barcode_by_gtin(ctx, store_id, gtin)
    }

    pub async fn requisition_counts(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<RequisitionCounts> {
        requisition_counts(ctx, store_id)
    }

    pub async fn log_file_names(&self, ctx: &Context<'_>) -> Result<LogNode> {
        log_file_names(ctx)
    }

    pub async fn log_contents(
        &self,
        ctx: &Context<'_>,
        file_name: Option<String>,
    ) -> Result<LogNode> {
        log_content(ctx, file_name)
    }

    pub async fn log_level(&self, ctx: &Context<'_>) -> Result<LogLevelNode> {
        log_level(ctx)
    }

    pub async fn last_successful_user_sync(
        &self,
        ctx: &Context<'_>,
    ) -> Result<update_user::UpdateUserNode> {
        last_successful_user_sync(ctx)
    }

    pub async fn plugins(&self, ctx: &Context<'_>) -> Result<Vec<PluginNode>> {
        get_plugins(ctx)
    }

    pub async fn temperature_chart(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Must be before toDatetime")] from_datetime: DateTime<Utc>,
        #[graphql(desc = "Must be after fromDatetime")] to_datetime: DateTime<Utc>,
        #[graphql(desc = "Minimum 3 and maximum 100")] number_of_data_points: i32,
        filter: Option<TemperatureLogFilterInput>,
    ) -> Result<TemperatureChartResponse> {
        temperature_chart(
            ctx,
            store_id,
            from_datetime,
            to_datetime,
            number_of_data_points,
            filter,
        )
    }

    pub async fn currencies(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Filter option")] filter: Option<CurrencyFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<CurrencySortInput>>,
    ) -> Result<CurrenciesResponse> {
        currencies(ctx, filter, sort)
    }

    pub async fn database_settings(&self, ctx: &Context<'_>) -> Result<DatabaseSettingsNode> {
        database_settings(ctx)
    }
}

#[derive(Default, Clone)]
pub struct GeneralMutations;

#[Object]
impl GeneralMutations {
    pub async fn update_sync_settings(
        &self,
        ctx: &Context<'_>,
        input: SyncSettingsInput,
    ) -> Result<UpdateSyncSettingsResponse> {
        update_sync_settings(ctx, input).await
    }

    // Only available for graphql introspection, error will be thrown after PreInitialisation state
    pub async fn initialise_site(
        &self,
        ctx: &Context<'_>,
        input: SyncSettingsInput,
    ) -> Result<InitialiseSiteResponse> {
        initialise_site(ctx, input).await
    }

    pub async fn manual_sync(&self, ctx: &Context<'_>) -> Result<String> {
        manual_sync(ctx, true)
    }

    pub async fn update_display_settings(
        &self,
        ctx: &Context<'_>,
        input: DisplaySettingsInput,
    ) -> Result<UpdateDisplaySettingsResponse> {
        update_display_settings(ctx, input)
    }

    pub async fn insert_barcode(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: BarcodeInput,
    ) -> Result<mutations::barcode::InsertResponse> {
        insert_barcode(ctx, &store_id, input)
    }

    pub async fn update_log_level(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: LogLevelInput,
    ) -> Result<UpsertLogLevelResponse> {
        update_log_level(ctx, store_id, input)
    }

    pub async fn update_user(&self, ctx: &Context<'_>) -> Result<update_user::UpdateResponse> {
        update_user::update_user(ctx).await
    }
}

/// Auth is not checked during initialisation stage
#[derive(Default, Clone)]
pub struct InitialisationQueries;

#[Object]
impl InitialisationQueries {
    pub async fn sync_settings(&self, ctx: &Context<'_>) -> Result<Option<SyncSettingsNode>> {
        sync_settings(ctx, false)
    }
    /// Available without authorisation in operational and initialisation states
    pub async fn initialisation_status(
        &self,
        ctx: &Context<'_>,
    ) -> Result<InitialisationStatusNode> {
        initialisation_status(ctx)
    }

    pub async fn latest_sync_status(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<FullSyncStatusNode>> {
        latest_sync_status(ctx, false)
    }
}
/// Auth is not checked during initialisation stage
#[derive(Default, Clone)]
pub struct InitialisationMutations;

#[Object]
impl InitialisationMutations {
    pub async fn initialise_site(
        &self,
        ctx: &Context<'_>,
        input: SyncSettingsInput,
    ) -> Result<InitialiseSiteResponse> {
        initialise_site(ctx, input).await
    }

    pub async fn manual_sync(&self, ctx: &Context<'_>) -> Result<String> {
        manual_sync(ctx, false)
    }
}

pub struct MasterListNotFoundForThisStore;
#[Object]
impl MasterListNotFoundForThisStore {
    pub async fn description(&self) -> &'static str {
        "Master list not found (might not be visible to this store)"
    }
}

/// Discovery queries
#[derive(Default, Clone)]
pub struct DiscoveryQueries;

#[Object]
impl DiscoveryQueries {
    pub async fn initialisation_status(
        &self,
        ctx: &Context<'_>,
    ) -> Result<InitialisationStatusNode> {
        initialisation_status(ctx)
    }
}
