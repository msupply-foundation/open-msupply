use async_graphql::{Context, Error, Object};
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};
use repository::MasterList;
use service::master_list::query_lines::get_master_list_lines_count;

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

    pub async fn lines_count(&self, ctx: &Context<'_>) -> Result<Option<i64>, Error> {
        let count = get_master_list_lines_count(
            &ctx.get_connection_manager().connection()?,
            &self.master_list.id,
        )
        .map_err(StandardGraphqlError::from_repository_error)?;

        Ok(Some(count as i64))
    }
}

impl MasterListNode {
    pub fn from_domain(master_list: MasterList) -> Self {
        MasterListNode { master_list }
    }
}
