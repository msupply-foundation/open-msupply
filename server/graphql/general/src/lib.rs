pub mod campaign;
mod mutations;
mod queries;
mod sync_api_error;
pub mod types;

pub use self::queries::sync_status::*;
use self::queries::*;

use abbreviation::abbreviations;
use diagnosis::diagnoses_active;
use graphql_core::pagination::PaginationInput;
use service::sync::CentralServerConfig;

use crate::store_preference::store_preferences;
use graphql_types::types::{
    AbbreviationNode, CurrenciesResponse, CurrencyFilterInput, CurrencySortInput, DiagnosisNode,
    MasterListFilterInput, StorePreferenceNode,
};
use mutations::{
    barcode::{insert_barcode, BarcodeInput},
    common::SyncSettingsInput,
    display_settings::{
        update_display_settings, DisplaySettingsInput, UpdateDisplaySettingsResponse,
    },
    initialise_site::{initialise_site, InitialiseSiteResponse},
    insert_insurance::{insert_insurance, InsertInsuranceInput, InsertInsuranceResponse},
    label_printer_settings::{
        update_label_printer_settings, LabelPrinterSettingsInput,
        UpdateLabelPrinterSettingsResponse,
    },
    log::{update_log_level, LogLevelInput, UpsertLogLevelResponse},
    manual_sync::manual_sync,
    sync_settings::{update_sync_settings, UpdateSyncSettingsResponse},
    update_insurance::{update_insurance, UpdateInsuranceInput, UpdateInsuranceResponse},
    update_name_properties::{
        update_name_properties, UpdateNamePropertiesInput, UpdateNamePropertiesResponse,
    },
    update_user,
};
use queries::{
    abbreviation::AbbreviationFilterInput,
    currency::currencies,
    display_settings::{display_settings, DisplaySettingsHash, DisplaySettingsNode},
    initialisation_status::{initialisation_status, InitialisationStatusNode},
    insurance_policies::{
        insurance_policies, insurance_policy, InsuranceResponse, InsuranceSortInput,
        InsurancesResponse,
    },
    insurance_providers::{insurance_providers, InsuranceProvidersResponse},
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

    pub async fn item_price(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: ItemPriceInput,
    ) -> Result<ItemPriceResponse> {
        item_price(ctx, store_id, input).await
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

    pub async fn is_central_server(&self) -> bool {
        CentralServerConfig::is_central_server()
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

    pub async fn master_list_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        master_list_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<MasterListLineFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<MasterListLineSortInput>>,
    ) -> Result<MasterListLinesResponse> {
        master_list_lines(ctx, store_id, master_list_id, page, filter, sort)
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

    pub async fn ledger(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Filter option")] filter: Option<LedgerFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<LedgerSortInput>>,
    ) -> Result<LedgerResponse> {
        ledger(ctx, store_id, filter, sort)
    }

    pub async fn item_ledger(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<ItemLedgerFilterInput>,
    ) -> Result<ItemLedgerResponse> {
        item_ledger(ctx, store_id, page, filter)
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

    #[graphql(deprecation = "Since 2.8.0. Use reason_options instead")]
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

    pub async fn frontend_plugin_metadata(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Vec<FrontendPluginMetadataNode>> {
        frontend_plugin_metadata(ctx)
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

    /// Generates new supplier return lines in memory, based on either stock line ids, or an item id.
    /// Optionally includes existing supplier return lines for a specific item in a return.
    /// Provides an friendly shape to edit these lines before calling the insert/update mutations.
    pub async fn generate_supplier_return_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: GenerateSupplierReturnLinesInput,
    ) -> Result<GenerateSupplierReturnLinesResponse> {
        generate_supplier_return_lines(ctx, store_id, input)
    }

    #[graphql(deprecation = "Since 2.8.0. Use reason_options instead")]
    pub async fn return_reasons(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<ReturnReasonFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<ReturnReasonSortInput>>,
    ) -> Result<ReturnReasonResponse> {
        return_reasons(ctx, page, filter, sort)
    }

    /// Generates new customer_return lines in memory, based on supplier return line ids.
    /// Optionally includes existing customer_return lines for a specific item in a return.
    /// Provides an friendly shape to edit these lines before calling the insert/update mutations.
    pub async fn generate_customer_return_lines(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: GenerateCustomerReturnLinesInput,
    ) -> Result<GenerateCustomerReturnLinesResponse> {
        generate_customer_return_lines(ctx, store_id, input)
    }

    pub async fn label_printer_settings(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<LabelPrinterSettingNode>> {
        label_printer_settings(ctx)
    }

    pub async fn name_properties(&self, ctx: &Context<'_>) -> Result<NamePropertyResponse> {
        name_properties(ctx)
    }

    pub async fn reason_options(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<ReasonOptionFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<ReasonOptionSortInput>>,
    ) -> Result<ReasonOptionResponse> {
        reason_options(ctx, page, filter, sort)
    }

    /// Query omSupply "cold_storage_type" entries
    pub async fn cold_storage_types(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<ColdStorageTypeFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<ColdStorageTypeSortInput>>,
    ) -> Result<ColdStorageTypesResponse> {
        cold_storage_types(ctx, store_id, page, filter, sort)
    }

    pub async fn diagnoses_active(&self, ctx: &Context<'_>) -> Result<Vec<DiagnosisNode>> {
        diagnoses_active(ctx)
    }

    pub async fn abbreviations(
        &self,
        ctx: &Context<'_>,
        filter: Option<AbbreviationFilterInput>,
    ) -> Result<Vec<AbbreviationNode>> {
        abbreviations(ctx, filter)
    }

    pub async fn insurance_policies(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        name_id: String,
        sort: Option<Vec<InsuranceSortInput>>,
    ) -> Result<InsurancesResponse> {
        insurance_policies(ctx, store_id, name_id, sort)
    }

    pub async fn insurance_policy(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<InsuranceResponse> {
        insurance_policy(ctx, store_id, id)
    }

    pub async fn insurance_providers(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<InsuranceProvidersResponse> {
        insurance_providers(ctx, store_id)
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

    pub async fn manual_sync(
        &self,
        ctx: &Context<'_>,
        fetch_patient_id: Option<String>,
    ) -> Result<String> {
        manual_sync(ctx, true, fetch_patient_id)
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

    pub async fn update_label_printer_settings(
        &self,
        ctx: &Context<'_>,
        input: LabelPrinterSettingsInput,
    ) -> Result<UpdateLabelPrinterSettingsResponse> {
        update_label_printer_settings(ctx, input)
    }

    pub async fn update_name_properties(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateNamePropertiesInput,
    ) -> Result<UpdateNamePropertiesResponse> {
        update_name_properties(ctx, &store_id, input)
    }

    async fn insert_insurance(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertInsuranceInput,
    ) -> Result<InsertInsuranceResponse> {
        insert_insurance(ctx, &store_id, input)
    }

    async fn update_insurance(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateInsuranceInput,
    ) -> Result<UpdateInsuranceResponse> {
        update_insurance(ctx, &store_id, input)
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

    pub async fn manual_sync(
        &self,
        ctx: &Context<'_>,
        _fetch_patient_id: Option<String>,
    ) -> Result<String> {
        manual_sync(ctx, false, None)
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

// Central server only mutations
#[derive(Default, Clone)]
pub struct CentralGeneralMutations;

#[Object]
impl CentralGeneralMutations {
    pub async fn configure_name_properties(
        &self,
        ctx: &Context<'_>,
        input: Vec<ConfigureNamePropertyInput>,
    ) -> Result<ConfigureNamePropertiesResponse> {
        configure_name_properties(ctx, input)
    }
}
