use super::InvoiceNode;

use crate::{
    database::repository::InvoiceQueryRepository,
    server::service::graphql::{schema::queries::pagination::Pagination, ContextExt},
};

use async_graphql::{Context, Object};

pub struct InvoiceList {
    pub pagination: Option<Pagination>,
}

#[Object]
impl InvoiceList {
    async fn total_count(&self, ctx: &Context<'_>) -> i64 {
        let repository = ctx.get_repository::<InvoiceQueryRepository>();
        repository.count().unwrap()
    }

    async fn nodes(&self, ctx: &Context<'_>) -> Vec<InvoiceNode> {
        let repository = ctx.get_repository::<InvoiceQueryRepository>();

        repository
            .all(&self.pagination)
            .map_or(Vec::<InvoiceNode>::new(), |list| {
                list.into_iter().map(InvoiceNode::from).collect()
            })
    }
}
