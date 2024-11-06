use async_graphql::*;
use dataloader::DataLoader;
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    loader::{
        IndicatorValueLoader, IndicatorValueLoaderInput, IndicatorValuePayload,
        ProgramIndicatorValue,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{
    EqualFilter, ProgramIndicatorFilter, ProgramIndicatorSort, ProgramIndicatorSortField,
};
use service::programs::program_indicator::query::{
    ColumnValue, IndicatorColumn, IndicatorLine, ProgramIndicator, ValueType,
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

    pub async fn lines(&self) -> Vec<IndicatorLineNode> {
        self.program_indicator
            .lines
            .clone()
            .into_iter()
            .map(IndicatorLineNode::from_domain)
            .collect()
    }
}

impl IndicatorLineNode {
    pub fn from_domain(line: IndicatorLine) -> IndicatorLineNode {
        IndicatorLineNode { line }
    }
}

pub struct IndicatorLineNode {
    pub line: IndicatorLine,
}

#[Object]
impl IndicatorLineNode {
    pub async fn code(&self) -> &str {
        &self.line.code
    }

    pub async fn name(&self) -> &str {
        &self.line.name
    }

    pub async fn values(&self) -> Vec<IndicatorColumnNode> {
        self.line
            .value
            .clone()
            .into_iter()
            .map(IndicatorColumnNode::from_domain)
            .collect()
    }
}

impl IndicatorColumnNode {
    pub fn from_domain(column: IndicatorColumn) -> IndicatorColumnNode {
        IndicatorColumnNode { column }
    }
}

pub struct IndicatorColumnNode {
    pub column: IndicatorColumn,
}

#[Object]
impl IndicatorColumnNode {
    pub async fn name(&self) -> &str {
        &self.column.header
    }

    pub async fn value(
        &self,
        ctx: &Context<'_>,
        period_id: String,
        supplier_store_id: String,
        customer_name_id: String,
    ) -> Result<IndicatorValueNode> {
        let loader = ctx.get_loader::<DataLoader<IndicatorValueLoader>>();
        let payload = IndicatorValuePayload {
            period_id,
            supplier_store_id,
            customer_name_id,
        };
        let result = loader
            .load_one(IndicatorValueLoaderInput::new(
                &self.column.line_id,
                &self.column.id,
                payload,
            ))
            .await?
            .ok_or(
                StandardGraphqlError::InternalError(format!(
                    "Cannot find value for line {} and column {}",
                    &self.column.line_id, &self.column.id,
                ))
                .extend(),
            )?;
        Ok(IndicatorValueNode::from_domain(result))
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum IndicatorValueType {
    String,
    Number,
}

impl IndicatorValueType {
    pub fn from_domain(r#type: &ValueType) -> Self {
        match r#type {
            ValueType::Number => IndicatorValueType::Number,
            ValueType::String => IndicatorValueType::String,
        }
    }
}

#[derive(Union)]
pub enum ColumnValueOutput {
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

impl From<ColumnValue> for ColumnValueOutput {
    fn from(value: ColumnValue) -> Self {
        match value {
            ColumnValue::Text(text) => ColumnValueOutput::Text(TextOutput { value: text }),
            ColumnValue::Number(number) => {
                ColumnValueOutput::Number(NumberOutput { value: number })
            }
        }
    }
}

pub struct IndicatorValueNode {
    pub id: String,
    pub value: String,
}

#[Object]
impl IndicatorValueNode {
    pub async fn id(&self) -> &str {
        &self.id
    }

    pub async fn value(&self) -> &str {
        &self.value
    }
}

impl IndicatorValueNode {
    pub fn from_domain(value: ProgramIndicatorValue) -> IndicatorValueNode {
        IndicatorValueNode {
            value: value.value,
            id: value.id,
        }
    }
}
