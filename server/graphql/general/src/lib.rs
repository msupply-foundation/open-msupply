mod mutations;
mod queries;

use self::mutations::user_register::*;
use self::queries::*;

use async_graphql::*;
use graphql_core::pagination::PaginationInput;

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
        store_id: String,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<NameFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<NameSortInput>>,
    ) -> Result<NamesResponse> {
        get_names(ctx, &store_id, page, filter, sort)
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

    pub async fn invoice_counts(
        &self,
        _store_id: String,
        #[graphql(desc = "Timezone offset")] timezone_offset: Option<i32>,
    ) -> Result<InvoiceCounts> {
        invoice_counts(timezone_offset)
    }

    pub async fn stock_counts(
        &self,
        _store_id: String,
        #[graphql(desc = "Timezone offset")] timezone_offset: Option<i32>,
        #[graphql(desc = "Expiring soon threshold")] days_till_expired: Option<i32>,
    ) -> Result<StockCounts> {
        stock_counts(timezone_offset, days_till_expired)
    }
}

#[derive(Default, Clone)]
pub struct GeneralMutations;

#[Object]
impl GeneralMutations {
    async fn register_user(
        &self,
        ctx: &Context<'_>,
        input: UserRegisterInput,
    ) -> UserRegisterResponse {
        user_register(ctx, input)
    }
}
