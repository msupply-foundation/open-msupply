use async_graphql::{dataloader::DataLoader, Context, Object};
use repository::MasterList;

use crate::{
    loader::MasterListLineByMasterListId, standard_graphql_error::StandardGraphqlError, ContextExt,
};

use super::MasterListLineConnector;

#[derive(PartialEq, Debug)]
pub struct MasterListNode {
    master_list: MasterList,
}

#[Object]
impl MasterListNode {
    pub async fn id(&self) -> &str {
        &self.master_list.id
    }

    pub async fn name(&self) -> &str {
        &self.master_list.name
    }

    pub async fn code(&self) -> &str {
        &self.master_list.code
    }

    pub async fn description(&self) -> &str {
        &self.master_list.description
    }

    pub async fn lines(
        &self,
        ctx: &Context<'_>,
    ) -> Result<MasterListLineConnector, StandardGraphqlError> {
        let loader = ctx.get_loader::<DataLoader<MasterListLineByMasterListId>>();

        let lines_option = loader.load_one(self.master_list.id.clone()).await?;

        let result = match lines_option {
            None => MasterListLineConnector::empty(),
            Some(lines) => MasterListLineConnector::from_domain_vec(lines),
        };

        Ok(result)
    }
}

impl MasterListNode {
    pub fn from_domain(master_list: MasterList) -> Self {
        MasterListNode { master_list }
    }
}
