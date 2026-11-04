pub mod campaign;
pub mod custom_field;
pub mod help_document;
mod mutations;
pub use mutations::barcode::BarcodeMutations;
mod queries;
mod subscriptions;
mod sync_api_error;
mod sync_v7;
pub mod types;

use std::collections::HashMap;

pub use self::queries::item::{ItemSortFieldInput, ItemSortInput, ItemsResponse};
pub use self::queries::sync_status::*;
use self::queries::*;
pub use self::subscriptions::{InitialisationSubscriptions, SyncStatusSubscriptions};

use abbreviation::abbreviations;
use diagnosis::diagnoses_active;
use graphql_core::{ContextExt, pagination::PaginationInput};
use service::sync::CentralServerConfig;

use crate::store_preference::store_preferences;
use graphql_types::types::{
    AbbreviationNode, BarcodeMatchNode, BarcodeNode, BarcodeProposalNode, CurrenciesResponse,
    CurrencyFilterInput, CurrencySortInput, CustomFieldsResponse, DeleteResponse, DiagnosisNode,
    MasterListFilterInput, PeriodScheduleFilterInput, PeriodScheduleRowResponse,
    StorePreferenceNode,
};
use mutations::{
    barcode::{
        LegacyInsertBarcodeInput, LegacyInsertBarcodeResponse, ProposeBarcodeInput,
        delete_barcode_proposal, legacy_insert_barcode, propose_barcode,
    },
    common::SyncSettingsInput,
    display_settings::{
        DisplaySettingsInput, UpdateDisplaySettingsResponse, update_display_settings,
    },
    initialise_as_central_server::{
        InitialiseAsCentralServerInputNode, InitialiseAsCentralServerResponse,
        initialise_as_central_server,
    },
    initialise_site::{InitialiseSiteResponse, initialise_site},
    insert_insurance::{InsertInsuranceInput, InsertInsuranceResponse, insert_insurance},
    label_printer_settings::{
        LabelPrinterSettingsInput, UpdateLabelPrinterSettingsResponse,
        update_label_printer_settings,
    },
    log::{LogLevelInput, UpsertLogLevelResponse, update_log_level},
    maintenance_mode::{
        MaintenanceModeNode, ProcessorsPausedNode, SetMaintenanceModeResponse,
        is_maintenance_mode_query, maintenance_mode_query, processors_paused_query,
        set_maintenance_mode_mutation, set_processors_paused_mutation,
    },
    manual_sync::manual_sync,
    set_sync_paused::{SyncPausedNode, set_sync_paused},
    sync_api_pause::{SyncApiPausedNode, set_sync_api_paused_mutation, sync_api_paused_query},
    sync_settings::{UpdateSyncSettingsResponse, update_sync_settings},
    update_insurance::{UpdateInsuranceInput, UpdateInsuranceResponse, update_insurance},
    update_name_properties::{
        UpdateNamePropertiesInput, UpdateNamePropertiesResponse, update_name_properties,
    },
};
use queries::{
    abbreviation::AbbreviationFilterInput,
    currency::currencies,
    display_settings::{DisplaySettingsHash, DisplaySettingsNode, display_settings},
    initialisation_status::{
        InitialisationStatusNode, initialisation_status, operational_initialisation_status,
    },
    insurance_policies::{
        InsuranceResponse, InsuranceSortInput, InsurancesResponse, insurance_policies,
        insurance_policy,
    },
    insurance_providers::{InsuranceProvidersResponse, insurance_providers},
    migration_status::{MigrationStatusNode, migration_status},
    requisition_line_chart::{ConsumptionOptionsInput, StockEvolutionOptionsInput},
    requisition_line_forecast_preview::RequisitionLineForecastPreviewInput,
    shipping_method::{ShippingMethodFilterInput, ShippingMethodsResponse, get_shipping_methods},
    sync_settings::{SyncSettingsNode, sync_settings},
};

#[derive(Default, Clone)]
pub struct GeneralQueries;

#[Object]
impl GeneralQueries {
    pub async fn api_version(&self) -> String {
        env!("CARGO_PKG_VERSION").to_string()
    }

    /// The running server's version, from the repo-root package.json (e.g. "3.00.00-RC")
    pub async fn server_version(&self) -> String {
        repository::migrations::raw_app_version()
    }

    /// Authenticate with username + password. Issues an opaque session token, returned both in
    /// the response body and as an HttpOnly session cookie. There is no separate refresh token.
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

    /// Slides the existing session's expiry forward (no token rotation). Kept for backwards
    /// compatibility — web clients no longer need to call this, since the session slides on every
    /// authenticated request.
    pub async fn refresh_token(&self, ctx: &Context<'_>) -> RefreshTokenResponse {
        refresh_token(ctx)
    }

    pub async fn me(&self, ctx: &Context<'_>) -> Result<UserResponse> {
        me(ctx)
    }

    pub async fn is_central_server(&self) -> bool {
        CentralServerConfig::is_central_server()
    }

    /// Whether central is in maintenance mode, when only server admins can log in. Available
    /// without authentication so the login screen can say so before anyone tries.
    pub async fn is_maintenance_mode(&self, ctx: &Context<'_>) -> Result<bool> {
        is_maintenance_mode_query(ctx)
    }

    pub async fn is_central_standalone(&self) -> bool {
        CentralServerConfig::is_standalone_central()
    }

    pub async fn feature_flags(&self, ctx: &Context<'_>) -> HashMap<String, bool> {
        ctx.get_settings().features.clone().unwrap_or_default()
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

    pub async fn period_schedules(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        filter: Option<PeriodScheduleFilterInput>,
    ) -> Result<PeriodScheduleRowResponse> {
        period_schedules(ctx, store_id, filter)
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

    pub async fn outbound_shipment_counts(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Timezone offset")] timezone_offset: Option<i32>,
    ) -> Result<OutboundInvoiceCounts> {
        outbound_shipment_counts(ctx, store_id, timezone_offset)
    }

    pub async fn inbound_shipment_counts(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Timezone offset")] timezone_offset: Option<i32>,
    ) -> Result<InboundInvoiceCounts> {
        inbound_shipment_counts(ctx, store_id, timezone_offset)
    }

    pub async fn inbound_shipment_external_counts(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Timezone offset")] timezone_offset: Option<i32>,
    ) -> Result<InboundInvoiceCounts> {
        inbound_shipment_external_counts(ctx, store_id, timezone_offset)
    }

    #[graphql(
        deprecation = "Use outboundShipmentCounts, inboundShipmentCounts, or inboundShipmentExternalCounts instead"
    )]
    #[allow(deprecated)]
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

    /// An item's request line as the line editor's draft would save it, under a chosen
    /// forecast method, without saving anything: the line already on the order, or the one
    /// adding the item would create
    pub async fn requisition_line_forecast_preview(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: RequisitionLineForecastPreviewInput,
    ) -> Result<requisition_line_forecast_preview::PreviewResponse> {
        requisition_line_forecast_preview::forecast_preview(ctx, &store_id, input).await
    }

    pub async fn activity_logs(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<ActivityLogFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<ActivityLogSortInput>>,
    ) -> Result<ActivityLogResponse> {
        activity_logs(ctx, store_id, page, filter, sort)
    }

    /// Available without authorisation in operational and initialisation states
    pub async fn initialisation_status(&self) -> Result<InitialisationStatusNode> {
        Ok(operational_initialisation_status())
    }

    /// Available without authorisation in all states (Operational, Initialisation and MigratingDatabase)
    pub async fn migration_status(&self, ctx: &Context<'_>) -> Result<MigrationStatusNode> {
        migration_status(ctx).await
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

    /// Admin pause flag (Admin > Sync settings); any signed-in user may read it.
    pub async fn is_sync_paused(&self, ctx: &Context<'_>) -> Result<bool> {
        is_sync_paused(ctx)
    }

    pub async fn sync_settings(&self, ctx: &Context<'_>) -> Result<Option<SyncSettingsNode>> {
        sync_settings(ctx, true)
    }

    /// Central only: whether the sync API is paused, refusing sync from remote sites (always false on a remote)
    pub async fn is_sync_api_paused(&self, ctx: &Context<'_>) -> Result<bool> {
        sync_api_paused_query(ctx)
    }

    /// Central only: whether the transfer and general processors are paused (always false on a remote)
    pub async fn are_processors_paused(&self, ctx: &Context<'_>) -> Result<bool> {
        processors_paused_query(ctx)
    }

    /// Central only: maintenance mode, and how much of OMS central's own sync buffer is left to
    /// integrate before it can be turned off (server admin only)
    pub async fn maintenance_mode(&self, ctx: &Context<'_>) -> Result<MaintenanceModeNode> {
        maintenance_mode_query(ctx)
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
        #[graphql(desc = "Low stock threshold in months")] low_stock_threshold: Option<f64>,
        #[graphql(desc = "High stock threshold in months")] high_stock_threshold: Option<f64>,
    ) -> Result<ItemCounts> {
        item_counts(ctx, store_id, low_stock_threshold, high_stock_threshold)
    }

    pub async fn store_preferences(
        &self,
        ctx: &Context<'_>,
        store_id: String,
    ) -> Result<StorePreferenceNode> {
        store_preferences(ctx, &store_id)
    }

    /// Everything a scan of `barcode` (as scanned or typed) matches: confirmed
    /// barcodes first, then proposals made on this site, one per item and only
    /// for items visible in the store. Empty for a barcode nobody has mapped yet.
    pub async fn barcode_matches(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        barcode: String,
    ) -> Result<Vec<BarcodeMatchNode>> {
        barcode_matches(ctx, store_id, barcode)
    }

    /// Deprecated: use `barcodeMatches`. Answers with the one item a scan of `gtin`
    /// matches; RecordNotFound when it matches none, or several items.
    #[graphql(deprecation = "Use `barcodeMatches`")]
    pub async fn barcode_by_gtin(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        gtin: String,
    ) -> Result<BarcodeResponse> {
        barcode_by_gtin(ctx, store_id, gtin)
    }

    /// The item's confirmed barcodes
    pub async fn item_barcodes(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        item_id: String,
    ) -> Result<Vec<BarcodeNode>> {
        item_barcodes(ctx, store_id, item_id)
    }

    /// Proposals for the item central hasn't confirmed or removed: every store's
    /// on central, this site's elsewhere
    pub async fn item_barcode_proposals(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        item_id: String,
    ) -> Result<Vec<BarcodeProposalNode>> {
        item_barcode_proposals(ctx, store_id, item_id)
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

    pub async fn frontend_plugin_metadata(
        &self,
        ctx: &Context<'_>,
        #[graphql(
            desc = "Which front end this client is (`react`, `solid`, ...), so it \
                    is served only the bundles it can load. Omit only from a \
                    pre-existing old-UI build: absent means the React \
                    module-federation UI."
        )]
        host_runtime: Option<String>,
    ) -> Result<Vec<FrontendPluginMetadataNode>> {
        frontend_plugin_metadata(ctx, host_runtime)
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

    /// Properties v2 definitions. Used by list views, detail views and modals
    /// to learn what columns/fields to render. Filter by `scope` to restrict
    /// to a record kind (`{ equalTo: "customer" }`).
    pub async fn custom_fields(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Filter option")] filter: Option<CustomFieldFilterInput>,
    ) -> Result<CustomFieldsResponse> {
        custom_fields(ctx, filter)
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

    /// Query omSupply "location_type" entries
    pub async fn location_types(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<LocationTypeFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<LocationTypeSortInput>>,
    ) -> Result<LocationTypesResponse> {
        location_types(ctx, store_id, page, filter, sort)
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

    pub async fn shipping_methods(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        filter: Option<ShippingMethodFilterInput>,
    ) -> Result<ShippingMethodsResponse> {
        get_shipping_methods(ctx, &store_id, filter)
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

    // Only available for graphql introspection, error will be thrown after PreInitialisation state
    pub async fn initialise_as_central_server(
        &self,
        ctx: &Context<'_>,
        input: InitialiseAsCentralServerInputNode,
    ) -> Result<InitialiseAsCentralServerResponse> {
        initialise_as_central_server(ctx, input).await
    }

    pub async fn manual_sync(
        &self,
        ctx: &Context<'_>,
        // TODO remove
        _fetch_patient_id: Option<String>,
    ) -> Result<String> {
        manual_sync(ctx, true)
    }

    /// Pause or resume sync (server admin only). See `SyncPausedNode`.
    pub async fn set_sync_paused(&self, ctx: &Context<'_>, paused: bool) -> Result<SyncPausedNode> {
        set_sync_paused(ctx, paused)
    }

    pub async fn update_display_settings(
        &self,
        ctx: &Context<'_>,
        input: DisplaySettingsInput,
    ) -> Result<UpdateDisplaySettingsResponse> {
        update_display_settings(ctx, input)
    }

    /// Records that a user picked an item for a barcode in this store, for central
    /// to review. Call it when the line the scan opened is saved.
    pub async fn propose_barcode(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: ProposeBarcodeInput,
    ) -> Result<BarcodeMatchNode> {
        propose_barcode(ctx, &store_id, input)
    }

    /// Withdraws a proposal made by a store on this site. It stops matching scans
    /// here, and central stops reviewing it.
    pub async fn delete_barcode_proposal(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<DeleteResponse> {
        delete_barcode_proposal(ctx, &store_id, &id)
    }

    /// Deprecated: use `proposeBarcode`, or `centralServer.barcode.insertBarcode`
    /// on central. Adds a confirmed barcode on central and proposes one elsewhere.
    #[graphql(deprecation = "Use `proposeBarcode`")]
    pub async fn insert_barcode(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: LegacyInsertBarcodeInput,
    ) -> Result<LegacyInsertBarcodeResponse> {
        legacy_insert_barcode(ctx, &store_id, input)
    }

    pub async fn update_log_level(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: LogLevelInput,
    ) -> Result<UpsertLogLevelResponse> {
        update_log_level(ctx, store_id, input)
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

    /// Available without authorisation in all states
    pub async fn migration_status(&self, ctx: &Context<'_>) -> Result<MigrationStatusNode> {
        migration_status(ctx).await
    }

    /// Available without authorisation/authentication
    pub async fn is_central_server(&self) -> bool {
        CentralServerConfig::is_central_server()
    }

    /// The running server's version, from the repo-root package.json (e.g. "3.00.00-RC")
    pub async fn server_version(&self) -> String {
        repository::migrations::raw_app_version()
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

    pub async fn initialise_as_central_server(
        &self,
        ctx: &Context<'_>,
        input: InitialiseAsCentralServerInputNode,
    ) -> Result<InitialiseAsCentralServerResponse> {
        initialise_as_central_server(ctx, input).await
    }

    pub async fn manual_sync(
        &self,
        ctx: &Context<'_>,
        // TODO remove
        _fetch_patient_id: Option<String>,
    ) -> Result<String> {
        manual_sync(ctx, false)
    }
}

/// Auth is not checked during migration stage
#[derive(Default, Clone)]
pub struct MigrationQueries;

#[Object]
impl MigrationQueries {
    pub async fn migration_status(&self, ctx: &Context<'_>) -> Result<MigrationStatusNode> {
        migration_status(ctx).await
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

    /// Pause or resume the v6/v7 sync API remote sites sync through, e.g. during central maintenance.
    /// Returns the new state.
    pub async fn set_sync_api_paused(
        &self,
        ctx: &Context<'_>,
        paused: bool,
    ) -> Result<SyncApiPausedNode> {
        set_sync_api_paused_mutation(ctx, paused)
    }

    /// Pause or resume the transfer and general processors. Resuming triggers each one so the
    /// backlog is picked up. Returns the new state.
    pub async fn set_processors_paused(
        &self,
        ctx: &Context<'_>,
        paused: bool,
    ) -> Result<ProcessorsPausedNode> {
        set_processors_paused_mutation(ctx, paused)
    }

    /// Turn maintenance mode on or off. On pauses sync, the sync API and processors and signs out
    /// every user who is not a server admin. Off is refused while OMS central's own sync buffer
    /// has records left to integrate.
    pub async fn set_maintenance_mode(
        &self,
        ctx: &Context<'_>,
        on: bool,
    ) -> Result<SetMaintenanceModeResponse> {
        set_maintenance_mode_mutation(ctx, on)
    }
}
