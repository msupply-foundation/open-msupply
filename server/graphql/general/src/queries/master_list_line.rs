use async_graphql::*;
use dataloader::DataLoader;
use graphql_types::types::{ItemNode, MasterListFilterInput};
use repository::{
    EqualFilter, MasterListLine, MasterListLineFilter, MasterListLineSort, PaginationOption,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    ListResult,
};

use graphql_core::{
    generic_filters::EqualFilterStringInput,
    loader::ItemLoader,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

pub async fn master_list_lines(
    ctx: &Context<'_>,
    store_id: String,
    master_list_id: String,
    page: Option<PaginationInput>,
    filter: Option<MasterListLineFilterInput>,
    sort: Option<Vec<MasterListLineSortInput>>,
) -> Result<MasterListLinesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryMasterList,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let pagination = page.map(PaginationOption::from);
    let domain_filter = filter.map(MasterListLineFilterInput::to_domain);
    let domain_sort = sort
        .and_then(|mut sort_list| sort_list.pop())
        .map(|sort| sort.to_domain());

    let master_lists = tokio::task::spawn_blocking(move || -> Result<_, service::ListError> {
        let service_context = service_provider.context(store_id, user.user_id)?;
        service_provider.master_list_service.get_master_list_lines(
            &service_context,
            &master_list_id,
            pagination,
            domain_filter,
            domain_sort,
        )
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(MasterListLinesResponse::Response(
        MasterListLineConnector::from_domain(master_lists),
    ))
}

#[derive(PartialEq, Debug)]
pub struct MasterListLineNode {
    master_list_line: MasterListLine,
}

#[derive(SimpleObject)]
pub struct MasterListLineConnector {
    total_count: u32,
    nodes: Vec<MasterListLineNode>,
}

#[derive(Union)]
pub enum MasterListLinesResponse {
    Response(MasterListLineConnector),
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::MasterListLineSortField")]
#[graphql(rename_items = "camelCase")]
pub enum MasterListLineSortFieldInput {
    Name,
    Code,
}

#[derive(InputObject)]
pub struct MasterListLineSortInput {
    /// Sort query result by `key`
    key: MasterListLineSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

impl MasterListLineSortInput {
    pub fn to_domain(&self) -> MasterListLineSort {
        MasterListLineSort {
            key: self.key.into(),
            desc: self.desc,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct MasterListLineFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub item_id: Option<EqualFilterStringInput>,
    pub master_list_id: Option<EqualFilterStringInput>,
    pub master_list: Option<MasterListFilterInput>,
    pub ignore_for_orders: Option<bool>,
}

impl MasterListLineFilterInput {
    pub fn to_domain(self) -> MasterListLineFilter {
        MasterListLineFilter {
            id: self.id.map(EqualFilter::from),
            item_id: self.item_id.map(EqualFilter::from),
            master_list_id: self.master_list_id.map(EqualFilter::from),
            item_type: None,
            master_list: self.master_list.map(|f| f.to_domain()),
            ignore_for_orders: self.ignore_for_orders,
        }
    }
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
