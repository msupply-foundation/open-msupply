use async_graphql::{Enum, InputObject, Object, SimpleObject, Union};
use graphql_core::generic_filters::{EqualFilterStringInput};
use repository::{
    EqualFilter, ProgramIndicatorFilter, ProgramIndicatorSort, ProgramIndicatorSortField,
    
};
use service::programs::program_indicator::query::{ProgramIndicator, IndicatorLine}

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
    pub program_id: Option<EqualFilterStringInput>,
    // TODO add fields
    // pub period_id: Option<EqualFilterStringInput>,
    // pub customer_id: Option<EqualFilterStringInput>,
    // pub supplier_id: Option<EqualFilterStringInput>,
}

impl From<ProgramIndicatorFilterInput> for ProgramIndicatorFilter {
    fn from(f: ProgramIndicatorFilterInput) -> Self {
        ProgramIndicatorFilter {
            id: None,
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

    pub async fn code(&self) -> &str {
        &self.program_indicator.code
    }

    pub async fn line(&self) -> &Vec<IndicatorLine>    {
        &self.program_indicator.value
    }   
}
