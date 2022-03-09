use async_graphql::{dataloader::DataLoader, Context, ErrorExtensions, Object, Result};
use graphql_core::{
    loader::{IdAndStoreId, NameByIdLoader},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::schema::StoreRow;

use super::NameNode;

#[derive(PartialEq, Debug)]
pub struct StoreNode {
    store: StoreRow,
}

#[Object]
impl StoreNode {
    pub async fn id(&self) -> &str {
        &self.store.id
    }

    pub async fn code(&self) -> &str {
        &self.store.code
    }

    pub async fn name(&self, ctx: &Context<'_>, store_id: String) -> Result<NameNode> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();

        let response_option = loader
            .load_one(IdAndStoreId {
                id: self.store.name_id.clone(),
                store_id,
            })
            .await?;

        response_option.map(NameNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find name ({}) linked to store ({})",
                &self.store.name_id, &self.store.id
            ))
            .extend(),
        )
    }
}

impl From<StoreRow> for StoreNode {
    fn from(store: StoreRow) -> Self {
        StoreNode { store }
    }
}
