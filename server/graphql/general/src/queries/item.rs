use async_graphql::*;
use graphql_core::{
    generic_filters::{EqualFilterStringInput, SimpleStringFilterInput},
    map_filter,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{ItemConnector, ItemNodeType};
use repository::{EqualFilter, PaginationOption, SimpleStringFilter};
use repository::{ItemFilter, ItemSort, ItemSortField};
use service::{
    auth::{Resource, ResourceAccessRequest},
    item::get_items,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::ItemSortField")]
#[graphql(rename_items = "camelCase")]
pub enum ItemSortFieldInput {
    Name,
    Code,
    Type,
}

#[derive(InputObject)]
pub struct ItemSortInput {
    /// Sort query result by `key`
    key: ItemSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterItemTypeInput {
    pub equal_to: Option<ItemNodeType>,
    pub equal_any: Option<Vec<ItemNodeType>>,
    pub not_equal_to: Option<ItemNodeType>,
}

#[derive(InputObject, Clone)]
pub struct ItemFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<SimpleStringFilterInput>,
    pub r#type: Option<EqualFilterItemTypeInput>,
    pub code: Option<SimpleStringFilterInput>,
    pub is_visible: Option<bool>,
    pub code_or_name: Option<SimpleStringFilterInput>,
}

#[derive(Union)]
pub enum ItemsResponse {
    Response(ItemConnector),
}

pub fn items(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<ItemFilterInput>,
    sort: Option<Vec<ItemSortInput>>,
) -> Result<ItemsResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryItems,
            store_id: Some(store_id.clone()),
        },
    )?;

    let connection_manager = ctx.get_connection_manager();
    let items = get_items(
        connection_manager,
        page.map(PaginationOption::from),
        filter.map(|filter| filter.to_domain()),
        // Currently only one sort option is supported, use the first from the list.
        sort.and_then(|mut sort_list| sort_list.pop())
            .map(|sort| sort.to_domain()),
        &store_id,
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ItemsResponse::Response(ItemConnector::from_domain(items)))
}

impl ItemFilterInput {
    pub fn to_domain(self) -> ItemFilter {
        let ItemFilterInput {
            id,
            name,
            r#type,
            code,
            is_visible,
            code_or_name,
        } = self;

        ItemFilter {
            id: id.map(EqualFilter::from),
            name: name.map(SimpleStringFilter::from),
            code: code.map(SimpleStringFilter::from),
            r#type: r#type.map(|t| map_filter!(t, ItemNodeType::to_domain)),
            is_visible,
            code_or_name: code_or_name.map(SimpleStringFilter::from),
        }
    }
}

impl ItemSortInput {
    pub fn to_domain(self) -> ItemSort {
        use ItemSortField as to;
        use ItemSortFieldInput as from;
        let key = match self.key {
            from::Name => to::Name,
            from::Code => to::Code,
            from::Type => to::Type,
        };

        ItemSort {
            key,
            desc: self.desc,
        }
    }
}
