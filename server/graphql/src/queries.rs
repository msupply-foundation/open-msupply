use async_graphql::*;
use domain::PaginationOption;
use domain::{invoice::InvoiceFilter, location::LocationFilter};
use graphql_core::pagination::PaginationInput;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_general_queries::store::*;
use graphql_general_queries::*;
use graphql_invoice::invoice_queries::*;
use graphql_requisition::requisition_queries::*;
use graphql_stocktake::stocktake_queries::*;
use graphql_types::types::*;
use service::invoice::get_invoices;

pub struct Queries;

#[Object]
impl Queries {
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
    ) -> AuthTokenResponse {
        login(ctx, &username, &password)
    }

    pub async fn logout(&self, ctx: &Context<'_>) -> LogoutResponse {
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
        _store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<NameFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<NameSortInput>>,
    ) -> Result<NamesResponse> {
        names(ctx, page, filter, sort)
    }

    pub async fn stores(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<StoreFilterInput>,
    ) -> Result<StoresResponse> {
        stores(ctx, page, filter)
    }

    /// Query omSupply "locations" entries
    pub async fn locations(
        &self,
        ctx: &Context<'_>,
        _store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<LocationFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<LocationSortInput>>,
    ) -> Result<LocationsResponse> {
        let service_provider = ctx.service_provider();
        let service_context = service_provider.context()?;

        let locations = service_provider
            .location_service
            .get_locations(
                &service_context,
                page.map(PaginationOption::from),
                filter.map(LocationFilter::from),
                // Currently only one sort option is supported, use the first from the list.
                sort.map(|mut sort_list| sort_list.pop())
                    .flatten()
                    .map(|sort| sort.to_domain()),
            )
            .map_err(StandardGraphqlError::from_list_error)?;

        Ok(LocationsResponse::Response(LocationConnector::from_domain(
            locations,
        )))
    }

    /// Query omSupply "master_lists" entries
    pub async fn master_lists(
        &self,
        ctx: &Context<'_>,
        _store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<MasterListFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<MasterListSortInput>>,
    ) -> Result<MasterListsResponse> {
        master_lists(ctx, page, filter, sort)
    }

    /// Query omSupply "item" entries
    pub async fn items(
        &self,
        ctx: &Context<'_>,
        _store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<ItemFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<ItemSortInput>>,
    ) -> Result<ItemsResponse> {
        items(ctx, page, filter, sort)
    }

    pub async fn invoice(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "id of the invoice")] id: String,
    ) -> InvoiceResponse {
        let connection_manager = ctx.get_connection_manager();
        get_invoice(connection_manager, Some(&store_id), id)
    }

    pub async fn invoice_by_number(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        invoice_number: u32,
        r#type: InvoiceNodeType,
    ) -> Result<InvoiceResponse> {
        get_invoice_by_number(ctx, &store_id, invoice_number, r#type)
    }

    pub async fn invoices(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<InvoiceFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<InvoiceSortInput>>,
    ) -> Result<InvoicesResponse> {
        let connection_manager = ctx.get_connection_manager();
        let invoices = get_invoices(
            connection_manager,
            Some(&store_id),
            page.map(PaginationOption::from),
            filter.map(InvoiceFilter::from),
            // Currently only one sort option is supported, use the first from the list.
            sort.map(|mut sort_list| sort_list.pop())
                .flatten()
                .map(|sort| sort.to_domain()),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

        Ok(InvoicesResponse::Response(InvoiceConnector::from_domain(
            invoices,
        )))
    }

    pub async fn invoice_counts(
        &self,
        _store_id: String,
        #[graphql(desc = "Timezone offset")] timezone_offset: Option<i32>,
    ) -> Result<InvoiceCounts> {
        invoice_counts(timezone_offset)
    }

    pub async fn stock_counts(
        &self,
        #[graphql(desc = "Timezone offset")] timezone_offset: Option<i32>,
        #[graphql(desc = "Expiring soon threshold")] days_till_expired: Option<i32>,
    ) -> Result<StockCounts> {
        stock_counts(timezone_offset, days_till_expired)
    }

    pub async fn stocktake(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<StocktakeResponse> {
        stocktake(ctx, &store_id, &id)
    }

    pub async fn stocktake_by_number(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        stocktake_number: i64,
    ) -> Result<StocktakeResponse> {
        stocktake_by_number(ctx, &store_id, stocktake_number)
    }

    pub async fn stocktakes(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<StocktakeFilterInput>,
        sort: Option<Vec<StocktakeSortInput>>,
    ) -> Result<StocktakesResponse> {
        stocktakes(ctx, &store_id, page, filter, sort)
    }

    pub async fn requisition(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<RequisitionResponse> {
        get_requisition(ctx, &store_id, &id)
    }

    pub async fn requisitions(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<RequisitionFilterInput>,
        sort: Option<Vec<RequisitionSortInput>>,
    ) -> Result<RequisitionsResponse> {
        get_requisitions(ctx, &store_id, page, filter, sort)
    }

    pub async fn requisition_by_number(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        requisition_number: u32,
        r#type: RequisitionNodeType,
    ) -> Result<RequisitionResponse> {
        get_requisition_by_number(ctx, &store_id, requisition_number, r#type)
    }
}
