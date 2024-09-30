use async_graphql::{Context, Error, InputObject, Object};
use graphql_core::{
    generic_filters::{EqualFilterStringInput, StringFilterInput},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{EqualFilter, MasterList, MasterListFilter, StringFilter};
use service::master_list::query_lines::get_master_list_lines_count;

#[derive(PartialEq, Debug)]
pub struct MasterListNode {
    master_list: MasterList,
}

#[derive(InputObject, Clone)]
pub struct MasterListFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
    pub code: Option<StringFilterInput>,
    pub description: Option<StringFilterInput>,
    pub exists_for_name: Option<StringFilterInput>,
    pub exists_for_name_id: Option<EqualFilterStringInput>,
    pub exists_for_store_id: Option<EqualFilterStringInput>,
    pub is_program: Option<bool>,
    pub item_id: Option<EqualFilterStringInput>,
}

impl MasterListFilterInput {
    pub fn to_domain(self) -> MasterListFilter {
        MasterListFilter {
            id: self.id.map(EqualFilter::from),
            name: self.name.map(StringFilter::from),
            code: self.code.map(StringFilter::from),
            description: self.description.map(StringFilter::from),
            exists_for_name: self.exists_for_name.map(StringFilter::from),
            exists_for_name_id: self.exists_for_name_id.map(EqualFilter::from),
            exists_for_store_id: self.exists_for_store_id.map(EqualFilter::from),
            is_program: self.is_program,
            item_id: self.item_id.map(EqualFilter::from),
            is_discount_list: None,
            is_default_price_list: None,
        }
    }
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

    pub fn from_vec(master_lists: Vec<MasterList>) -> Vec<Self> {
        master_lists.into_iter().map(Self::from_domain).collect()
    }
}
