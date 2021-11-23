use crate::ContextExt;
use domain::location::LocationFilter;
use domain::{invoice::InvoiceFilter, item::ItemFilter, name::NameFilter, PaginationOption};
use service::location::LocationServiceQuery;
use service::{invoice::get_invoices, item::get_items, name::get_names};

use async_graphql::{Context, Object};

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
        let connection_manager = ctx.get_connection_manager();
        match get_names(
            connection_manager,
            page.map(PaginationOption::from),
            filter.map(NameFilter::from),
            convert_sort(sort),
        ) {
            Ok(names) => NamesResponse::Response(names.into()),
            Err(error) => NamesResponse::Error(error.into()),
        }
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
        let location_service = ctx.get_service::<Box<dyn LocationServiceQuery>>();

        match location_service.get_locations(
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
        let connection_manager = ctx.get_connection_manager();
        match get_items(
            connection_manager,
            page.map(PaginationOption::from),
            filter.map(ItemFilter::from),
            convert_sort(sort),
        ) {
            Ok(items) => ItemsResponse::Response(items.into()),
            Err(error) => ItemsResponse::Error(error.into()),
        }
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
}
