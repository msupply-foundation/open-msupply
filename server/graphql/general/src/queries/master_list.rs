use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{MasterListFilterInput, MasterListNode};
use repository::PaginationOption;
use repository::{MasterList, MasterListSort};
use service::{
    auth::{Resource, ResourceAccessRequest},
    ListResult,
};
#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::MasterListSortField")]
#[graphql(rename_items = "camelCase")]
pub enum MasterListSortFieldInput {
    Name,
    Code,
    Description,
    DiscountPercentage,
}

#[derive(InputObject)]
pub struct MasterListSortInput {
    /// Sort query result by `key`
    key: MasterListSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

impl MasterListSortInput {
    pub fn to_domain(self) -> MasterListSort {
        MasterListSort {
            // From trait is auto implemented by graphql(remote) in MasterListSortFieldInput
            key: self.key.into(),
            desc: self.desc,
        }
    }
}

#[derive(SimpleObject)]
pub struct MasterListConnector {
    total_count: u32,
    nodes: Vec<MasterListNode>,
}

impl MasterListConnector {
    pub fn from_domain(from: ListResult<MasterList>) -> MasterListConnector {
        MasterListConnector {
            total_count: from.count,
            nodes: from
                .rows
                .into_iter()
                .map(MasterListNode::from_domain)
                .collect(),
        }
    }
}

#[derive(Union)]
pub enum MasterListsResponse {
    Response(MasterListConnector),
}

pub async fn master_lists(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<MasterListFilterInput>,
    sort: Option<Vec<MasterListSortInput>>,
) -> Result<MasterListsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryMasterList,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let pagination = page.map(PaginationOption::from);
    let domain_filter = filter.map(|filter| filter.to_domain());
    let domain_sort = sort
        .and_then(|mut sort_list| sort_list.pop())
        .map(|sort| sort.to_domain());

    let master_lists = tokio::task::spawn_blocking(move || -> Result<_, service::ListError> {
        let service_context = service_provider.context(store_id, user.user_id)?;
        service_provider.master_list_service.get_master_lists(
            &service_context,
            pagination,
            domain_filter,
            domain_sort,
        )
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(MasterListsResponse::Response(
        MasterListConnector::from_domain(master_lists),
    ))
}
