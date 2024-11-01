use async_graphql::{Enum, InputObject, Object, SimpleObject, Union};
use graphql_core::generic_filters::{EqualFilterStringInput, StringFilterInput};
use repository::{
    EqualFilter, ProgramIndicator, ProgramIndicatorFilter, ProgramIndicatorSort,
    ProgramIndicatorSortField, StringFilter,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ProgramIndicatorSortFieldInput {
    ProgramId,
    Code,
}

#[derive(InputObject)]
pub struct ProgramIndicatorSortInput {
    key: ProgramIndicatorSortFieldInput,
    desc: Option<bool>,
}

impl ProgramIndicatorSortInput {
    pub fn to_domain(self) -> ProgramIndicatorSort {
        let key = match self.key {
            ProgramIndicatorSortFieldInput::ProgramId => ProgramIndicatorSortField::ProgramId,
            ProgramIndicatorSortFieldInput::Code => ProgramIndicatorSortField::Code,
        };

        ProgramIndicatorSort {
            key,
            desc: self.desc,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct ProgramIndicatorFilterInput {
    pub code: Option<StringFilterInput>,
    pub program_id: Option<EqualFilterStringInput>,
}

impl From<ProgramIndicatorFilterInput> for ProgramIndicatorFilter {
    fn from(f: ProgramIndicatorFilterInput) -> Self {
        ProgramIndicatorFilter {
            id: None,
            code: f.code.map(StringFilter::from),
            program_id: f.program_id.map(EqualFilter::from),
        }
    }
}

#[derive(SimpleObject)]
pub struct ProgramIndicatorConnector {
    pub total_count: u32,
    pub nodes: Vec<ProgramIndicatorNode>,
}

#[derive(Union)]
pub enum ProgramIndicatorResponse {
    Response(ProgramIndicatorConnector),
}

pub struct ProgramIndicatorNode {
    pub program_indicator: ProgramIndicator,
}

#[Object]
impl ProgramIndicatorNode {
    pub async fn id(&self) -> &str {
        &self.program_indicator.id
    }

    pub async fn program_id(&self) -> &str {
        &self.program_indicator.program_id
    }

    pub async fn code(&self) -> &Option<String> {
        &self.program_indicator.code
    }

    // Loaders to be added here for columns and rows
}
