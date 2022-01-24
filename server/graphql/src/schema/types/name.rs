use async_graphql::*;
use dataloader::DataLoader;
use domain::name::Name;

use crate::{loader::StoreLoader, ContextExt};

use super::{NodeError, StoreNode};

#[Object]
impl NameNode {
    pub async fn id(&self) -> &str {
        &self.name.id
    }

    pub async fn name(&self) -> &str {
        &self.name.name
    }

    pub async fn code(&self) -> &str {
        &self.name.code
    }

    pub async fn is_customer(&self) -> bool {
        self.name.is_customer
    }

    pub async fn is_supplier(&self) -> bool {
        self.name.is_supplier
    }

    pub async fn store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let store_id = match &self.name.store_id {
            Some(store_id) => store_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<StoreLoader>>();
        Ok(loader
            .load_one(store_id.clone())
            .await?
            .map(StoreNode::from))
    }
}

#[derive(Union)]
pub enum NameResponse {
    Error(NodeError),
    Response(NameNode),
}

#[derive(PartialEq, Debug)]
pub struct NameNode {
    pub name: Name,
}

impl From<Name> for NameNode {
    fn from(name: Name) -> Self {
        NameNode { name }
    }
}
