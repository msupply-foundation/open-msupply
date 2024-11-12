use async_graphql::{
    dataloader::DataLoader, Context, Enum, Error, InputObject, Object, SimpleObject, Union,
};
use graphql_core::{
    generic_filters::EqualFilterStringInput, loader::ProgramByIdLoader, ContextExt,
};
use repository::{
    ColumnValue, EqualFilter, IndicatorColumnRow, IndicatorLineRow, IndicatorValueType,
    ProgramIndicatorFilter, ProgramIndicatorSort, ProgramIndicatorSortField,
};
use service::programs::program_indicator::query::ProgramIndicator;

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

    pub async fn lines(&self) -> Vec<IndicatorLineNode> {
        self.program_indicator
            .lines
            .clone()
            .into_iter()
            .map(IndicatorLineNode::from_domain)
            .collect()
    }

    pub async fn columns(&self) -> Vec<IndicatorColumnNode> {
        self.program_indicator
            .columns
            .clone()
            .into_iter()
            .map(IndicatorColumnNode::from_domain)
            .collect()
    }
}

impl IndicatorLineNode {
    pub fn from_domain(line: IndicatorLineRow) -> IndicatorLineNode {
        IndicatorLineNode { line }
    }
}

pub struct IndicatorLineNode {
    pub line: IndicatorLineRow,
}

#[Object]
impl IndicatorLineNode {
    pub async fn code(&self) -> &str {
        &self.line.code
    }

    pub async fn name(&self) -> &str {
        &self.line.description
    }

    pub async fn default_value(&self) -> Result<ColumnValueNode, Error> {
        let default_value = self.line.get_default_value(&self.line.default_value)?;
        Ok(ColumnValueNode::from_domain(default_value))
    }
}

impl IndicatorColumnNode {
    pub fn from_domain(column: IndicatorColumnRow) -> IndicatorColumnNode {
        IndicatorColumnNode { column }
    }
}

pub struct IndicatorColumnNode {
    pub column: IndicatorColumnRow,
}

#[Object]
impl IndicatorColumnNode {
    pub async fn id(&self) -> &str {
        &self.column.id
    }
    pub async fn name(&self) -> &str {
        &self.column.header
    }

    pub async fn value_type(&self) -> IndicatorValueTypeNode {
        IndicatorValueTypeNode::from_domain(&self.column.value_type)
    }

    pub async fn default_value(&self) -> Result<ColumnValueNode, Error> {
        let default_value = self.column.get_default_value(&self.column.default_value)?;
        Ok(ColumnValueNode::from_domain(default_value))
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

#[derive(Union)]
pub enum ColumnValueNode {
    Text(TextOutput),
    Number(NumberOutput),
}

pub struct TextOutput {
    value: String,
}

#[Object]
impl TextOutput {
    async fn value(&self) -> &str {
        &self.value
    }
}

pub struct NumberOutput {
    value: f64,
}

#[Object]
impl NumberOutput {
    async fn value(&self) -> f64 {
        self.value
    }
}

impl ColumnValueNode {
    fn from_domain(value: ColumnValue) -> ColumnValueNode {
        match value {
            ColumnValue::Text(text) => ColumnValueNode::Text(TextOutput { value: text }),
            ColumnValue::Number(number) => ColumnValueNode::Number(NumberOutput { value: number }),
        }
    }
}
