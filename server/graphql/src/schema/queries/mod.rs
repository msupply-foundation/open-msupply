use crate::ContextExt;
use domain::location::LocationFilter;
use domain::{invoice::InvoiceFilter, PaginationOption};
use service::invoice::get_invoices;

use async_graphql::{Context, Object, Result};

use super::types::*;
pub struct Queries;

pub mod login;
pub use self::login::*;
pub mod logout;
pub use self::logout::*;
pub mod me;
pub use self::me::*;
pub mod refresh_token;
pub use self::refresh_token::*;
pub mod invoice_counts;
pub use self::invoice_counts::*;
pub mod names;
pub use self::names::*;
pub mod item;
pub use self::item::*;

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

    pub async fn me(&self, ctx: &Context<'_>) -> UserResponse {
        me(ctx)
    }

    /// Query omSupply "name" entries
    pub async fn names(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<NameFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<NameSortInput>>,
    ) -> NamesResponse {
        names(ctx, page, filter, sort)
    }

    /// Query omSupply "item" entries
    pub async fn locations(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<LocationFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<LocationSortInput>>,
    ) -> LocationsResponse {
        let service_provider = ctx.service_provider();
        let service_context = match service_provider.context() {
            Ok(service) => service,
            Err(error) => return LocationsResponse::Error(error.into()),
        };

        match service_provider.location_service.get_locations(
            &service_context,
            page.map(PaginationOption::from),
            filter.map(LocationFilter::from),
            convert_sort(sort),
        ) {
            Ok(locations) => LocationsResponse::Response(locations.into()),
            Err(error) => LocationsResponse::Error(error.into()),
        }
    }

    /// Query omSupply "item" entries
    pub async fn items(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<ItemFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<ItemSortInput>>,
    ) -> ItemsResponse {
        items(ctx, page, filter, sort)
    }

    pub async fn invoice(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the invoice")] id: String,
    ) -> InvoiceResponse {
        let connection_manager = ctx.get_connection_manager();
        get_invoice_response(connection_manager, id)
    }

    pub async fn invoices(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Pagination option (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "Filter option")] filter: Option<InvoiceFilterInput>,
        #[graphql(desc = "Sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<InvoiceSortInput>>,
    ) -> InvoicesResponse {
        let connection_manager = ctx.get_connection_manager();
        match get_invoices(
            connection_manager,
            page.map(PaginationOption::from),
            filter.map(InvoiceFilter::from),
            convert_sort(sort),
        ) {
            Ok(invoices) => InvoicesResponse::Response(invoices.into()),
            Err(error) => InvoicesResponse::Error(error.into()),
        }
    }

    pub async fn invoice_counts(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Invoice type")] invoice_type: InvoiceNodeType,
        #[graphql(desc = "Timezone offset")] timezone_offset: Option<i32>,
    ) -> Result<InvoiceCountsResponse> {
        invoice_counts(ctx, invoice_type, timezone_offset)
    }
}
