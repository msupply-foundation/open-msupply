use crate::database::repository::StorageConnectionManager;
use crate::domain::invoice::InvoiceFilter;
use crate::domain::item::ItemFilter;
use crate::domain::name::NameFilter;
use crate::domain::PaginationOption;
use crate::server::service::graphql::ContextExt;
use crate::service::invoice::{get_invoice, get_invoices};
use crate::service::item::get_items;
use crate::service::name::get_names;

use async_graphql::{Context, Object};

use super::types::*;
pub struct Queries;

#[Object]
impl Queries {
    #[allow(non_snake_case)]
    pub async fn apiVersion(&self) -> String {
        "1.0".to_string()
    }

    pub async fn names(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "pagination (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "filters option")] filter: Option<NameFilterInput>,
        #[graphql(desc = "sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<NameSortInput>>,
    ) -> NamesResponse {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        get_names(
            connection_manager,
            page.map(PaginationOption::from),
            filter.map(NameFilter::from),
            convert_sort(sort),
        )
        .into()
    }

    pub async fn items(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "pagination (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "filters option")] filter: Option<ItemFilterInput>,
        #[graphql(desc = "sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<ItemSortInput>>,
    ) -> ItemsResponse {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        get_items(
            connection_manager,
            page.map(PaginationOption::from),
            filter.map(ItemFilter::from),
            convert_sort(sort),
        )
        .into()
    }

    pub async fn invoice(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the invoice")] id: String,
    ) -> InvoiceResponse {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        get_invoice(connection_manager, id).into()
    }

    pub async fn invoices(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "pagination (first and offset)")] page: Option<PaginationInput>,
        #[graphql(desc = "filters option")] filter: Option<InvoiceFilterInput>,
        #[graphql(desc = "sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<InvoiceSortInput>>,
    ) -> InvoicesResponse {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        get_invoices(
            connection_manager,
            page.map(PaginationOption::from),
            filter.map(InvoiceFilter::from),
            convert_sort(sort),
        )
        .into()
    }
}
