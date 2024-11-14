use async_graphql::{
    dataloader::DataLoader, Context, Enum, Error, InputObject, Object, SimpleObject, Union,
};
use graphql_core::{
    generic_filters::EqualFilterStringInput, loader::ProgramByIdLoader, ContextExt,
};
use repository::{
    EqualFilter, IndicatorColumnRow, IndicatorLineRow, IndicatorValueType, ProgramIndicatorFilter,
    ProgramIndicatorSort, ProgramIndicatorSortField,
};
use service::programs::program_indicator::query::{IndicatorLine, ProgramIndicator};

use super::program_node::ProgramNode;

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
    pub id: Option<EqualFilterStringInput>,
}

impl ProgramIndicatorFilterInput {
    pub fn to_domain(self) -> ProgramIndicatorFilter {
        ProgramIndicatorFilter {
            id: self.id.map(EqualFilter::from),
            program_id: self.program_id.map(EqualFilter::from),
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
        &self.program_indicator.program_indicator.id
    }

    pub async fn program(&self, ctx: &Context<'_>) -> Result<ProgramNode, Error> {
        let loader = ctx.get_loader::<DataLoader<ProgramByIdLoader>>();

        let result = loader
            .load_one(self.program_indicator.program_indicator.program_id.clone())
            .await?
            .map(|program| ProgramNode {
                program_row: program,
            })
            .ok_or(Error::new("Cannot find program"))?;

        Ok(result)
    }

    pub async fn code(&self) -> &Option<String> {
        &self.program_indicator.program_indicator.code
    }

    pub async fn line_and_columns(&self) -> Vec<IndicatorLineNode> {
        self.program_indicator
            .lines
            .clone()
            .into_iter()
            .map(IndicatorLineNode::from_domain)
            .collect()
    }
}

pub struct IndicatorLineNode {
    pub line: IndicatorLine,
}

impl IndicatorLineNode {
    pub fn from_domain(line: IndicatorLine) -> IndicatorLineNode {
        IndicatorLineNode { line }
    }
}

#[Object]
impl IndicatorLineNode {
    pub async fn line(&self) -> IndicatorLineRowNode {
        IndicatorLineRowNode::from_domain(self.line.line.clone())
    }

    pub async fn columns(&self) -> Vec<IndicatorColumnNode> {
        self.line
            .columns
            .clone()
            .into_iter()
            .map(|column| IndicatorColumnNode::from_domain(column, self.line.line.id.clone()))
            .collect()
    }
}

pub struct IndicatorLineRowNode {
    pub line: IndicatorLineRow,
}
impl IndicatorLineRowNode {
    pub fn from_domain(line: IndicatorLineRow) -> IndicatorLineRowNode {
        IndicatorLineRowNode { line }
    }
}

#[Object]
impl IndicatorLineRowNode {
    pub async fn code(&self) -> &str {
        &self.line.code
    }

    pub async fn name(&self) -> &str {
        &self.line.description
    }

    pub async fn line_number(&self) -> i32 {
        self.line.line_number
    }
}

impl IndicatorColumnNode {
    pub fn from_domain(column: IndicatorColumnRow, line_id: String) -> IndicatorColumnNode {
        IndicatorColumnNode { column, line_id }
    }
}

pub struct IndicatorColumnNode {
    pub column: IndicatorColumnRow,
    pub line_id: String,
}

#[Object]
impl IndicatorColumnNode {
    pub async fn name(&self) -> &str {
        &self.column.header
    }

    pub async fn value_type(&self) -> IndicatorValueTypeNode {
        IndicatorValueTypeNode::from_domain(&self.column.value_type)
    }

    pub async fn column_number(&self) -> i32 {
        self.column.column_number
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum IndicatorValueTypeNode {
    String,
    Number,
}

impl IndicatorValueTypeNode {
    pub fn from_domain(r#type: &Option<IndicatorValueType>) -> Self {
        match r#type {
            Some(IndicatorValueType::Number) => IndicatorValueTypeNode::Number,
            Some(IndicatorValueType::String) => IndicatorValueTypeNode::String,
            None => IndicatorValueTypeNode::String,
        }
    }
}
