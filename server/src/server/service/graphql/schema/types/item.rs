use crate::database::repository::ItemQueryRepository;
use crate::server::service::graphql::{schema::queries::pagination::Pagination, ContextExt};
use async_graphql::{Context, Object, SimpleObject};

#[derive(SimpleObject, PartialEq, Debug)]
#[graphql(name = "Item")]
pub struct ItemQuery {
    pub id: String,
    pub name: String,
    pub code: String,
    // Is visible is from master list join
    pub is_visible: bool,
}

pub struct ItemList {
    pub pagination: Option<Pagination>,
}

#[Object]
impl ItemList {
    async fn total_count(&self, ctx: &Context<'_>) -> i64 {
        let repository = ctx.get_repository::<ItemQueryRepository>();
        repository.count().unwrap()
    }

    async fn nodes(&self, ctx: &Context<'_>) -> Vec<ItemQuery> {
        let repository = ctx.get_repository::<ItemQueryRepository>();
        repository.all(&self.pagination).unwrap()
    }
}
