pub mod pagination;

use crate::database::repository::{
    InvoiceLineRepository, InvoiceQueryRepository, RepositoryError, RequisitionRepository,
    StoreRepository,
};
use crate::database::schema::{InvoiceLineRow, RequisitionRow, StoreRow};
use crate::server::service::graphql::schema::types::{
    InvoiceLine, InvoiceQuery, Requisition, Store,
};
use crate::server::service::graphql::ContextExt;

use super::types::{InvoicesList, ItemList, NameList};
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
        _ctx: &Context<'_>,
        #[graphql(desc = "pagination (first and offset)")] page: Option<Pagination>,
    ) -> NameList {
        NameList { pagination: page }
    }

    pub async fn items(
        &self,
        _ctx: &Context<'_>,
        #[graphql(desc = "pagination (first and offset)")] page: Option<Pagination>,
    ) -> ItemList {
        ItemList { pagination: page }
    }

    // TODO return better error
    pub async fn invoice(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the invoice")] id: String,
    ) -> Result<InvoiceQuery, RepositoryError> {
        let repository = ctx.get_repository::<InvoiceQueryRepository>();
        let invoice = repository.find_one_by_id(id.as_str()).await?;
        Ok(InvoiceQuery::from(invoice))
    }

    pub async fn invoices(
        &self,
        _ctx: &Context<'_>,
        #[graphql(desc = "pagination (first and offset)")] page: Option<Pagination>,
    ) -> InvoicesList {
        InvoicesList { pagination: page }
    }

    pub async fn store(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the store")] id: String,
    ) -> Store {
        let store_repository = ctx.get_repository::<StoreRepository>();

        let store_row: StoreRow = store_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get store {}", id));

        Store { store_row }
    }

    pub async fn invoice_line(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the invoice line")] id: String,
    ) -> InvoiceLine {
        let invoice_line_repository = ctx.get_repository::<InvoiceLineRepository>();

        let invoice_line_row: InvoiceLineRow = invoice_line_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get invoice line {}", id));

        InvoiceLine { invoice_line_row }
    }

    pub async fn requisition(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the requisition")] id: String,
    ) -> Requisition {
        let requisition_repository = ctx.get_repository::<RequisitionRepository>();

        let requisition_row: RequisitionRow = requisition_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get requisition {}", id));

        Requisition { requisition_row }
    }
}
