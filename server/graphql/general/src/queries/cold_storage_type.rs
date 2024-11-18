use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::ColdStorageTypeNode;
use repository::{
    ColdStorageType, ColdStorageTypeFilter, ColdStorageTypeSort, ColdStorageTypeSortField,
};
use repository::{EqualFilter, PaginationOption};
use service::{
    auth::{Resource, ResourceAccessRequest},
    cold_storage_type::get_cold_storage_types,
    ListResult,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::ColdStorageTypeSortField")]
#[graphql(rename_items = "camelCase")]
pub enum ColdStorageTypeSortFieldInput {
    Id,
    Name,
}

#[derive(InputObject)]
pub struct ColdStorageTypeSortInput {
    /// Sort query result by `key`
    key: ColdStorageTypeSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct ColdStorageTypeFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<EqualFilterStringInput>,
}

#[derive(SimpleObject)]
pub struct ColdStorageTypeConnector {
    total_count: u32,
    nodes: Vec<ColdStorageTypeNode>,
}

#[derive(Union)]
pub enum ColdStorageTypesResponse {
    Response(ColdStorageTypeConnector),
}

pub fn cold_storage_types(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<ColdStorageTypeFilterInput>,
    sort: Option<Vec<ColdStorageTypeSortInput>>,
) -> Result<ColdStorageTypesResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryItems,
            store_id: Some(store_id.clone()),
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let cold_storage_types = get_cold_storage_types(
        connection_manager,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        // Currently only one sort option is supported, use the first from the list.
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ColdStorageTypesResponse::Response(
        ColdStorageTypeConnector::from_domain(cold_storage_types),
    ))
}

impl ColdStorageTypeFilterInput {
    pub fn to_domain(self) -> ColdStorageTypeFilter {
        let ColdStorageTypeFilterInput { id, name } = self;

        ColdStorageTypeFilter {
            id: id.map(EqualFilter::from),
            name: name.map(EqualFilter::from),
        }
    }
}

impl ColdStorageTypeSortInput {
    pub fn to_domain(self) -> ColdStorageTypeSort {
        use ColdStorageTypeSortField as to;
        use ColdStorageTypeSortFieldInput as from;
        let key = match self.key {
            from::Name => to::Name,
            from::Id => to::Id,
        };

        ColdStorageTypeSort {
            key,
            desc: self.desc,
        }
    }
}

impl ColdStorageTypeConnector {
    pub fn from_domain(cold_storage_types: ListResult<ColdStorageType>) -> Self {
        let ListResult { rows, count } = cold_storage_types;

        ColdStorageTypeConnector {
            total_count: count,
            nodes: rows
                .into_iter()
                .map(|row| ColdStorageTypeNode::from_domain(row.cold_storage_type_row))
                .collect(),
        }
    }
}
