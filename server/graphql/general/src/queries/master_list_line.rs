use async_graphql::*;
use dataloader::DataLoader;
use graphql_types::types::ItemNode;
use repository::MasterListLine;
use service::ListResult;

use graphql_core::{loader::ItemLoader, standard_graphql_error::StandardGraphqlError};

#[derive(PartialEq, Debug)]
pub struct MasterListLineNode {
    master_list_line: MasterListLine,
}

#[derive(SimpleObject)]
pub struct MasterListLineConnector {
    total_count: u32,
    nodes: Vec<MasterListLineNode>,
}

impl MasterListLineConnector {
    pub fn from_domain(from: ListResult<MasterListLine>) -> MasterListLineConnector {
        MasterListLineConnector {
            total_count: from.count,
            nodes: from
                .rows
                .into_iter()
                .map(MasterListLineNode::from_domain)
                .collect(),
        }
    }
}

#[Object]
impl MasterListLineNode {
    pub async fn id(&self) -> &str {
        &self.master_list_line.id
    }

    pub async fn item_id(&self) -> &str {
        &self.master_list_line.item_id
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader
            .load_one(self.master_list_line.item_id.clone())
            .await?;

        let item = item_option.ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item_id {} for master_list_line_id {}",
                self.master_list_line.item_id, self.master_list_line.id
            ))
            .extend(),
        )?;

        Ok(ItemNode::from_domain(item))
    }
}

impl MasterListLineNode {
    pub fn from_domain(master_list_line: MasterListLine) -> Self {
        MasterListLineNode { master_list_line }
    }
}
