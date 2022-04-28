use async_graphql::{dataloader::DataLoader, Context, ErrorExtensions, Object, Result};
use graphql_core::{
    loader::{NameByIdLoader, NameByIdLoaderInput},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{Store, StoreRow};

use super::NameNode;

#[derive(PartialEq, Debug)]
pub struct StoreNode {
    store: Store,
}

#[Object]
impl StoreNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn name(&self, ctx: &Context<'_>, store_id: String) -> Result<NameNode> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();

        let response_option = loader
            .load_one(NameByIdLoaderInput::new(&store_id, &self.row().name_id))
            .await?;

        response_option.map(NameNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find name ({}) linked to store ({})",
                &self.row().name_id,
                &self.row().id
            ))
            .extend(),
        )
    }

    pub async fn site_id(&self) -> i32 {
        self.row().site_id
    }
}

impl StoreNode {
    pub fn from_domain(store: Store) -> StoreNode {
        StoreNode { store }
    }

    pub fn row(&self) -> &StoreRow {
        &self.store.store_row
    }
}
