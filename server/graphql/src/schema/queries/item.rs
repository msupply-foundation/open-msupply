use async_graphql::*;
use domain::{PaginationOption, SimpleStringFilter};
use repository::ItemFilter;
use service::item::get_items;

use crate::{
    schema::types::{
        sort_filter_types::{
            convert_sort, EqualFilterBoolInput, SimpleStringFilterInput, SortInput,
        },
        ConnectorError, ItemNode, PaginationInput,
    },
    ContextExt,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "domain::item::ItemSortField")]
#[graphql(rename_items = "camelCase")]
pub enum ItemSortFieldInput {
    Name,
    Code,
}
pub type ItemSortInput = SortInput<ItemSortFieldInput>;

#[derive(InputObject, Clone)]
pub struct ItemFilterInput {
    pub name: Option<SimpleStringFilterInput>,
    pub code: Option<SimpleStringFilterInput>,
    pub is_visible: Option<EqualFilterBoolInput>,
}

impl From<ItemFilterInput> for ItemFilter {
    fn from(f: ItemFilterInput) -> Self {
        ItemFilter {
            id: None,
            name: f.name.map(SimpleStringFilter::from),
            code: f.code.map(SimpleStringFilter::from),
            is_visible: f.is_visible.and_then(|filter| filter.equal_to),
            r#type: None,
        }
    }
}

#[derive(SimpleObject)]
pub struct ItemConnector {
    total_count: u32,
    nodes: Vec<ItemNode>,
}

#[derive(Union)]
pub enum ItemsResponse {
    Error(ConnectorError),
    Response(ItemConnector),
}

pub fn items(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<ItemFilterInput>,
    sort: Option<Vec<ItemSortInput>>,
) -> ItemsResponse {
    let connection_manager = ctx.get_connection_manager();
    match get_items(
        connection_manager,
        page.map(PaginationOption::from),
        filter.map(ItemFilter::from),
        convert_sort(sort),
    ) {
        Ok(items) => ItemsResponse::Response(ItemConnector {
            total_count: items.count,
            nodes: items.rows.into_iter().map(ItemNode::from).collect(),
        }),
        Err(error) => ItemsResponse::Error(error.into()),
    }
}
