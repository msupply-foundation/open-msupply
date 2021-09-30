use crate::database::repository::{NameQueryFilter, NameQueryRepository};
use crate::server::service::graphql::{schema::queries::pagination::Pagination, ContextExt};
use async_graphql::{Context, Object, SimpleObject};

#[derive(SimpleObject, PartialEq, Debug)]
#[graphql(name = "Name")]
pub struct NameQuery {
    pub id: String,
    pub name: String,
    pub code: String,
    // Below are from name_store_join
    pub is_customer: bool,
    pub is_supplier: bool,
}

pub struct NameList {
    pub pagination: Option<Pagination>,
    pub filter: Option<NameQueryFilter>,
}

#[Object]
impl NameList {
    async fn total_count(&self, ctx: &Context<'_>) -> i64 {
        let repository = ctx.get_repository::<NameQueryRepository>();
        repository.count().unwrap()
    }

    async fn nodes(&self, ctx: &Context<'_>) -> Vec<NameQuery> {
        let repository = ctx.get_repository::<NameQueryRepository>();
        repository.all(&self.pagination, &self.filter).unwrap()
    }
}
