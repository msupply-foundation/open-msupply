pub mod pagination;

use crate::database::repository::{
    InvoiceLineRepository, InvoiceQueryRepository, RepositoryError, RequisitionRepository,
    StorageConnectionManager, StoreRepository,
};
use crate::database::schema::{InvoiceLineRow, RequisitionRow, StoreRow};
use crate::domain::item::ItemFilter;
use crate::domain::name::NameFilter;
use crate::domain::PaginationOption;
use crate::server::service::graphql::schema::types::{InvoiceLine, Requisition, Store};
use crate::server::service::graphql::ContextExt;
use crate::service::item::get_items;
use crate::service::name::get_names;

use super::types::{
    convert_sort, InvoiceFilterInput, InvoiceList, InvoiceNode, InvoiceSortInput, ItemFilterInput,
    ItemSortInput, ItemsResponse, NameFilterInput, NameSortInput, NamesResponse, PaginationInput,
};
use async_graphql::{Context, Object};
use pagination::Pagination;
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
        let connection_pool = ctx.get_repository::<StorageConnectionManager>();
        get_names(
            connection_pool,
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
        let connection_pool = ctx.get_repository::<StorageConnectionManager>();
        get_items(
            connection_pool,
            page.map(PaginationOption::from),
            filter.map(ItemFilter::from),
            convert_sort(sort),
        )
        .into()
    }

    // TODO return better error
    pub async fn invoice(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the invoice")] id: String,
    ) -> Result<InvoiceNode, RepositoryError> {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        let connection = connection_manager.connection().unwrap();

        let repository = InvoiceQueryRepository::new(&connection);
        let invoice = repository.find_one_by_id(id.as_str())?;
        Ok(InvoiceNode::from(invoice))
    }

    pub async fn invoices(
        &self,
        _ctx: &Context<'_>,
        #[graphql(desc = "pagination (first and offset)")] page: Option<Pagination>,
        #[graphql(desc = "filters option")] filter: Option<InvoiceFilterInput>,
        #[graphql(desc = "sort options (only first sort input is evaluated for this endpoint)")]
        sort: Option<Vec<InvoiceSortInput>>,
    ) -> InvoiceList {
        InvoiceList {
            pagination: page,
            filter,
            sort,
        }
    }

    pub async fn store(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the store")] id: String,
    ) -> Store {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        let connection = connection_manager.connection().unwrap();

        let store_repository = StoreRepository::new(&connection);
        let store_row: StoreRow = store_repository
            .find_one_by_id(&id)
            .unwrap_or_else(|_| panic!("Failed to get store {}", id));

        Store { store_row }
    }

    pub async fn invoice_line(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the invoice line")] id: String,
    ) -> InvoiceLine {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        let connection = connection_manager.connection().unwrap();
        let invoice_line_repository = InvoiceLineRepository::new(&connection);

        let invoice_line_row: InvoiceLineRow = invoice_line_repository
            .find_one_by_id(&id)
            .unwrap_or_else(|_| panic!("Failed to get invoice line {}", id));

        InvoiceLine { invoice_line_row }
    }

    pub async fn requisition(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the requisition")] id: String,
    ) -> Requisition {
        let connection_manager = ctx.get_repository::<StorageConnectionManager>();
        let connection = connection_manager.connection().unwrap();
        let requisition_repository = RequisitionRepository::new(&connection);

        let requisition_row: RequisitionRow = requisition_repository
            .find_one_by_id(&id)
            .unwrap_or_else(|_| panic!("Failed to get requisition {}", id));

        Requisition { requisition_row }
    }
}
