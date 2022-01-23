use async_graphql::*;
use domain::{name::NameFilter, EqualFilter, PaginationOption, SimpleStringFilter};

use service::name::get_names;

use crate::schema::types::sort_filter_types::{convert_sort, EqualFilterStringInput};
use crate::schema::types::{name::NameNode, PaginationInput};
use crate::ContextExt;

use super::{ConnectorError, SimpleStringFilterInput, SortInput};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "domain::name::NameSortField")]
#[graphql(rename_items = "camelCase")]
pub enum NameSortFieldInput {
    Name,
    Code,
}
pub type NameSortInput = SortInput<NameSortFieldInput>;

#[derive(InputObject, Clone)]
pub struct NameFilterInput {
    pub id: Option<EqualFilterStringInput>,
    /// Filter by name
    pub name: Option<SimpleStringFilterInput>,
    /// Filter by code
    pub code: Option<SimpleStringFilterInput>,
    /// Filter by customer property
    pub is_customer: Option<bool>,
    /// Filter by supplier property
    pub is_supplier: Option<bool>,
}

impl From<NameFilterInput> for NameFilter {
    fn from(f: NameFilterInput) -> Self {
        NameFilter {
            id: f.id.map(EqualFilter::from),
            name: f.name.map(SimpleStringFilter::from),
            code: f.code.map(SimpleStringFilter::from),
            is_customer: f.is_customer,
            is_supplier: f.is_supplier,
        }
    }
}

#[derive(SimpleObject)]
pub struct NameConnector {
    total_count: u32,
    nodes: Vec<NameNode>,
}

#[derive(Union)]
pub enum NamesResponse {
    Error(ConnectorError),
    Response(NameConnector),
}

pub fn names(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<NameFilterInput>,
    sort: Option<Vec<NameSortInput>>,
) -> NamesResponse {
    let connection_manager = ctx.get_connection_manager();
    match get_names(
        connection_manager,
        page.map(PaginationOption::from),
        filter.map(NameFilter::from),
        convert_sort(sort),
    ) {
        Ok(names) => NamesResponse::Response(NameConnector {
            total_count: names.count,
            nodes: names.rows.into_iter().map(NameNode::from).collect(),
        }),
        Err(error) => NamesResponse::Error(error.into()),
    }
}
