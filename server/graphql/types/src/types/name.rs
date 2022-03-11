use async_graphql::*;
use dataloader::DataLoader;
use repository::{schema::NameRow, Name};

use graphql_core::{loader::StoreByIdLoader, simple_generic_errors::NodeError, ContextExt};

use super::StoreNode;

#[Object]
impl NameNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn is_customer(&self) -> bool {
        self.name.is_customer()
    }

    pub async fn is_supplier(&self) -> bool {
        self.name.is_supplier()
    }

    pub async fn store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let store_id = match self.name.store_id() {
            Some(store_id) => store_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();
        Ok(loader
            .load_one(store_id.to_string())
            .await?
            .map(StoreNode::from_domain))
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

impl NameNode {
    pub fn from_domain(name: Name) -> NameNode {
        NameNode { name }
    }

    pub fn row(&self) -> &NameRow {
        &self.name.name_row
    }
}
