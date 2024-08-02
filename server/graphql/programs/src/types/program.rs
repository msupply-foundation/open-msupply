use async_graphql::*;

use graphql_core::generic_filters::{EqualFilterStringInput, StringFilterInput};
use graphql_types::types::program_node::ProgramNode;
use repository::{
    EqualFilter, ProgramFilter, ProgramRow, ProgramSort, ProgramSortField, StringFilter,
};
use service::ListResult;

#[derive(SimpleObject)]
pub struct ProgramConnector {
    pub total_count: u32,
    pub nodes: Vec<ProgramNode>,
}

#[derive(Union)]
pub enum ProgramsResponse {
    Response(ProgramConnector),
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ProgramSortFieldInput {
    Name,
}

#[derive(InputObject)]
pub struct ProgramSortInput {
    /// Sort query result by `key`
    key: ProgramSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

impl ProgramSortInput {
    pub fn to_domain(self) -> ProgramSort {
        let key = match self.key {
            ProgramSortFieldInput::Name => ProgramSortField::Name,
        };

        ProgramSort {
            key,
            desc: self.desc,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct ProgramFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub name: Option<StringFilterInput>,
    pub context_id: Option<EqualFilterStringInput>,
    pub is_immunisation: Option<bool>,
    pub exists_for_store_id: Option<EqualFilterStringInput>,
}
impl From<ProgramFilterInput> for ProgramFilter {
    fn from(f: ProgramFilterInput) -> Self {
        ProgramFilter {
            id: f.id.map(EqualFilter::from),
            name: f.name.map(StringFilter::from),
            context_id: f.context_id.map(EqualFilter::from),
            is_immunisation: f.is_immunisation,
            exists_for_store_id: f.exists_for_store_id.map(EqualFilter::from),
        }
    }
}

impl ProgramConnector {
    pub fn from_domain(assets: ListResult<ProgramRow>) -> ProgramConnector {
        ProgramConnector {
            total_count: assets.count,
            nodes: assets
                .rows
                .into_iter()
                .map(|row| ProgramNode { program_row: row })
                .collect(),
        }
    }
}
