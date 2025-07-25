use async_graphql::*;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::LocationTypeNode;
use repository::{EqualFilter, PaginationOption};
use repository::{LocationType, LocationTypeFilter, LocationTypeSort, LocationTypeSortField};
use service::{
    auth::{Resource, ResourceAccessRequest},
    location_type::get_location_types,
    ListResult,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::LocationTypeSortField")]
#[graphql(rename_items = "camelCase")]
pub enum LocationTypeSortFieldInput {
    Id,
    Name,
    MinTemperature,
}

#[derive(InputObject)]
pub struct LocationTypeSortInput {
    /// Sort query result by `key`
    key: LocationTypeSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct LocationTypeFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<EqualFilterStringInput>,
}

#[derive(SimpleObject)]
pub struct LocationTypeConnector {
    total_count: u32,
    nodes: Vec<LocationTypeNode>,
}

#[derive(Union)]
pub enum LocationTypesResponse {
    Response(LocationTypeConnector),
}

pub fn cold_storage_types(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<LocationTypeFilterInput>,
    sort: Option<Vec<LocationTypeSortInput>>,
) -> Result<LocationTypesResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryItems,
            store_id: Some(store_id.clone()),
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let cold_storage_types = get_location_types(
        connection_manager,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        // Currently only one sort option is supported, use the first from the list.
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(LocationTypesResponse::Response(
        LocationTypeConnector::from_domain(cold_storage_types),
    ))
}

impl LocationTypeFilterInput {
    pub fn to_domain(self) -> LocationTypeFilter {
        let LocationTypeFilterInput { id, name } = self;

        LocationTypeFilter {
            id: id.map(EqualFilter::from),
            name: name.map(EqualFilter::from),
        }
    }
}

impl LocationTypeSortInput {
    pub fn to_domain(self) -> LocationTypeSort {
        use LocationTypeSortField as to;
        use LocationTypeSortFieldInput as from;
        let key = match self.key {
            from::Name => to::Name,
            from::Id => to::Id,
            from::MinTemperature => to::MinTemperature,
        };

        LocationTypeSort {
            key,
            desc: self.desc,
        }
    }
}

impl LocationTypeConnector {
    pub fn from_domain(cold_storage_types: ListResult<LocationType>) -> Self {
        let ListResult { rows, count } = cold_storage_types;

        LocationTypeConnector {
            total_count: count,
            nodes: rows
                .into_iter()
                .map(|row| LocationTypeNode::from_domain(row.cold_storage_type_row))
                .collect(),
        }
    }
}
