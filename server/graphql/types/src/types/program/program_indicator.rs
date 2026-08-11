use async_graphql::{
    dataloader::DataLoader, Context, Enum, Error, InputObject, Object, SimpleObject, Union,
};
use graphql_core::{
    generic_filters::EqualFilterStringInput,
    loader::{
        IndicatorValueLoader, IndicatorValueLoaderInput, ProgramByIdLoader,
        RequisitionIndicatorInfoLoader, RequisitionIndicatorInfoLoaderInput,
    },
    ContextExt,
};
use repository::{
    EqualFilter, IndicatorColumnRow, IndicatorLineRow, IndicatorValueRow, ProgramIndicatorFilter,
    ProgramIndicatorSort, ProgramIndicatorSortField,
};
use service::requisition::{
    common::indicator_value_type,
    program_indicator::query::{IndicatorLine, ProgramIndicator},
};

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

    pub async fn customer_indicator_info(
        &self,
        ctx: &Context<'_>,
        period_id: String,
        store_id: String,
    ) -> Result<Vec<CustomerIndicatorInformationNode>, Error> {
        let loader = ctx.get_loader::<DataLoader<RequisitionIndicatorInfoLoader>>();

        let result = loader
            .load_one(RequisitionIndicatorInfoLoaderInput::new(
                &self.line.line.id,
                &store_id,
                &period_id,
            ))
            .await?;

        Ok(result
            .map(CustomerIndicatorInformationNode::from_vec)
            .unwrap_or_default())
    }

    pub async fn columns(&self) -> Vec<IndicatorColumnNode> {
        self.line
            .columns
            .clone()
            .into_iter()
            .map(|column| IndicatorColumnNode::from_domain(column, self.line.line.clone()))
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

    /// The line's own configured type, null where it declares none (`var` in
    /// mSupply). A CELL's type is its column's `valueType`, which already
    /// resolves the fallback to this one.
    // Reported as configured: `unwrap_or_default()` here answered Number for a
    // `var` line, which no caller could tell from a line genuinely typed Number.
    pub async fn value_type(&self) -> Option<IndicatorValueTypeNode> {
        self.line
            .value_type
            .clone()
            .map(IndicatorValueTypeNode::from)
    }

    pub async fn is_active(&self) -> bool {
        self.line.is_active
    }
}

impl IndicatorColumnNode {
    pub fn from_domain(column: IndicatorColumnRow, line: IndicatorLineRow) -> IndicatorColumnNode {
        IndicatorColumnNode { column, line }
    }

    // Answering the column's RAW type here (`unwrap_or_default()`, i.e. Number)
    // made a `var` column on a text line indistinguishable from a genuinely
    // numeric one, so clients gave it a numeric input for a cell
    // `update_indicator_value` accepts text into.
    fn effective_value_type(&self) -> Option<IndicatorValueTypeNode> {
        indicator_value_type(&self.line, &self.column)
            .clone()
            .map(IndicatorValueTypeNode::from)
    }
}

pub struct IndicatorColumnNode {
    pub column: IndicatorColumnRow,
    /// The column's own line — its id addresses the stored value, and its
    /// configured type is the fallback behind `value_type` below.
    pub line: IndicatorLineRow,
}

#[Object]
impl IndicatorColumnNode {
    pub async fn name(&self) -> &str {
        &self.column.header
    }

    pub async fn id(&self) -> &str {
        &self.column.id
    }

    /// The cell's effective type — this column's configured type, falling back
    /// to its line's where the column declares none (`var` in mSupply). This is
    /// the type an edit is validated against, so it is the one to render an
    /// input from. Null where neither declares a type: an edit is then not
    /// type-checked at all.
    pub async fn value_type(&self) -> Option<IndicatorValueTypeNode> {
        self.effective_value_type()
    }

    pub async fn column_number(&self) -> i32 {
        self.column.column_number
    }

    pub async fn value(
        &self,
        ctx: &Context<'_>,
        period_id: String,
        store_id: String,
        customer_name_id: String,
    ) -> Result<Option<IndicatorValueNode>, Error> {
        let loader = ctx.get_loader::<DataLoader<IndicatorValueLoader>>();
        let result = loader
            .load_one(IndicatorValueLoaderInput::new(
                &self.line.id,
                &self.column.id,
                &period_id,
                &store_id,
                &customer_name_id,
            ))
            .await?;

        if let Some(value) = result {
            Ok(Some(IndicatorValueNode::from_domain(value)))
        } else {
            Ok(None)
        }
    }

    pub async fn is_active(&self) -> bool {
        self.column.is_active
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
#[graphql(remote = "repository::db_diesel::indicator_line_row
::IndicatorValueType")]
pub enum IndicatorValueTypeNode {
    String,
    Number,
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

#[cfg(test)]
mod tests {
    use super::*;
    use repository::IndicatorValueType;

    fn line(value_type: Option<IndicatorValueType>) -> IndicatorLineRow {
        IndicatorLineRow {
            id: "line".to_string(),
            value_type,
            ..Default::default()
        }
    }

    fn column(value_type: Option<IndicatorValueType>) -> IndicatorColumnRow {
        IndicatorColumnRow {
            id: "column".to_string(),
            value_type,
            ..Default::default()
        }
    }

    // What the `valueType` field answers (the resolver delegates to it).
    fn value_type_of(
        column_type: Option<IndicatorValueType>,
        line_type: Option<IndicatorValueType>,
    ) -> Option<IndicatorValueTypeNode> {
        IndicatorColumnNode::from_domain(column(column_type), line(line_type))
            .effective_value_type()
    }

    /// The cell's effective type is reported, not the column's raw one: a `var`
    /// column takes its line's type (what an edit is validated against), and
    /// only a cell typed nowhere answers null.
    #[test]
    fn column_value_type_falls_back_to_its_line() {
        use IndicatorValueType::{Number, String as Text};

        // The column's own type wins wherever it has one.
        assert_eq!(
            value_type_of(Some(Number), Some(Text)),
            Some(IndicatorValueTypeNode::Number)
        );
        assert_eq!(
            value_type_of(Some(Text), Some(Number)),
            Some(IndicatorValueTypeNode::String)
        );
        // A `var` column takes the line's — the case that used to report the
        // enum default (Number) and earn a numeric input on a text line.
        assert_eq!(
            value_type_of(None, Some(Text)),
            Some(IndicatorValueTypeNode::String)
        );
        assert_eq!(
            value_type_of(None, Some(Number)),
            Some(IndicatorValueTypeNode::Number)
        );
        // Typed nowhere: null, and the update validates nothing either.
        assert_eq!(value_type_of(None, None), None);
    }
}
