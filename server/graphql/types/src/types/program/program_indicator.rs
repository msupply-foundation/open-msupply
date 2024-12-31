use async_graphql::{
    dataloader::DataLoader, Context, Enum, Error, InputObject, Object, SimpleObject, Union,
};
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    loader::{
        IndicatorValueLoader, IndicatorValueLoaderInput, IndicatorValuePayload, ProgramByIdLoader,
        RequisitionIndicatorInfoLoader, RequisitionIndicatorInfoLoaderInput,
    },
    ContextExt,
};
use repository::{
    EqualFilter, IndicatorColumnRow, IndicatorLineRow, IndicatorValueRow, IndicatorValueType,
    ProgramIndicatorFilter, ProgramIndicatorSort, ProgramIndicatorSortField,
};
use service::requisition::program_indicator::query::{IndicatorLine, ProgramIndicator};

use super::{
    program_node::ProgramNode, requisition_indicator_info::CustomerIndicatorInformationNode,
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

    pub async fn customer_indicator_info(
        &self,
        ctx: &Context<'_>,
        period_id: String,
        store_id: String,
    ) -> Result<Vec<CustomerIndicatorInformationNode>, Error> {
        let loader = ctx.get_loader::<DataLoader<RequisitionIndicatorInfoLoader>>();

        let result = loader
            .load_one(RequisitionIndicatorInfoLoaderInput::new(
                &store_id,
                &self.program_indicator.program_indicator.program_id,
                period_id,
            ))
            .await?;

        Ok(result
            .into_iter()
            .flat_map(CustomerIndicatorInformationNode::from_vec)
            .collect())
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
    pub async fn id(&self) -> &str {
        &self.line.id
    }

    pub async fn code(&self) -> &str {
        &self.line.code
    }

    pub async fn name(&self) -> &str {
        &self.line.description
    }

    pub async fn line_number(&self) -> i32 {
        self.line.line_number
    }

    pub async fn value_type(&self) -> Option<IndicatorValueTypeNode> {
        IndicatorValueTypeNode::from_domain(&self.line.value_type)
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

    pub async fn value_type(&self) -> Option<IndicatorValueTypeNode> {
        IndicatorValueTypeNode::from_domain(&self.column.value_type)
    }

    pub async fn column_number(&self) -> i32 {
        self.column.column_number
    }

    pub async fn value(
        &self,
        ctx: &Context<'_>,
        period_id: String,
        store_id: String,
        customer_name_link_id: String,
    ) -> Result<Option<IndicatorValueNode>, Error> {
        let loader = ctx.get_loader::<DataLoader<IndicatorValueLoader>>();
        let payload = IndicatorValuePayload {
            period_id,
            store_id,
            customer_name_link_id,
        };

        let result = loader
            .load_one(IndicatorValueLoaderInput::new(
                &self.line_id,
                &self.column.id,
                payload,
            ))
            .await?;

        if let Some(value) = result {
            Ok(Some(IndicatorValueNode::from_domain(value)))
        } else {
            Ok(None)
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum IndicatorValueTypeNode {
    String,
    Number,
}

impl IndicatorValueTypeNode {
    pub fn from_domain(r#type: &Option<IndicatorValueType>) -> Option<Self> {
        match r#type {
            Some(IndicatorValueType::Number) => Some(IndicatorValueTypeNode::Number),
            Some(IndicatorValueType::String) => Some(IndicatorValueTypeNode::String),
            None => None,
        }
    }
}

pub struct IndicatorValueNode {
    pub value: IndicatorValueRow,
}

#[Object]
impl IndicatorValueNode {
    pub async fn id(&self) -> &str {
        &self.value.id
    }

    pub async fn value(&self) -> &str {
        &self.value.value
    }
}

impl IndicatorValueNode {
    pub fn from_domain(value: IndicatorValueRow) -> IndicatorValueNode {
        IndicatorValueNode { value }
    }
}
