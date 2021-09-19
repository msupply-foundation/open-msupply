pub mod pagination;

use crate::database::repository::{
    RequisitionRepository, StoreRepository, TransactLineRepository, TransactRepository,
};
use crate::database::schema::{RequisitionRow, StoreRow, TransactLineRow, TransactRow};
use crate::server::service::graphql::schema::types::{Requisition, Store, Transact, TransactLine};
use crate::server::service::graphql::ContextExt;

use super::types::{ItemList, NameList};
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

    pub async fn transact(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the transact")] id: String,
    ) -> Transact {
        let transact_repository = ctx.get_repository::<TransactRepository>();

        let transact_row: TransactRow = transact_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get transact {}", id));

        Transact { transact_row }
    }

    pub async fn transact_line(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "id of the transact line")] id: String,
    ) -> TransactLine {
        let transact_line_repository = ctx.get_repository::<TransactLineRepository>();

        let transact_line_row: TransactLineRow = transact_line_repository
            .find_one_by_id(&id)
            .await
            .unwrap_or_else(|_| panic!("Failed to get transact line {}", id));

        TransactLine { transact_line_row }
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
