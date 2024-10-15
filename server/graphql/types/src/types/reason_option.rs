use async_graphql::*;
use repository::{
    reason_option::ReasonOption,
    reason_option_row::{ReasonOptionRow, ReasonOptionType},
};
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct ReasonOptionNode {
    reason_option: ReasonOption,
}

#[derive(SimpleObject)]
pub struct ReasonOptionConnector {
    total_count: u32,
    nodes: Vec<ReasonOptionNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum ReasonOptionNodeType {
    PositiveInventoryAdjustment,
    NegativeInventoryAdjustment,
    ReturnReason,
    RequisitionLineVariance,
}

#[Object]
impl ReasonOptionNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn r#type(&self) -> ReasonOptionNodeType {
        ReasonOptionNodeType::from_domain(&self.row().r#type)
    }

    pub async fn is_active(&self) -> &bool {
        &self.row().is_active
    }

    pub async fn reason(&self) -> &str {
        &self.row().reason
    }
}

impl ReasonOptionNode {
    pub fn from_domain(reason_option: ReasonOption) -> Self {
        ReasonOptionNode { reason_option }
    }

    pub fn row(&self) -> &ReasonOptionRow {
        &self.reason_option.reason_option_row
    }
}

impl ReasonOptionNodeType {
    pub fn from_domain(from: &ReasonOptionType) -> ReasonOptionNodeType {
        use ReasonOptionNodeType as to;
        use ReasonOptionType as from;

        match from {
            from::PositiveInventoryAdjustment => to::PositiveInventoryAdjustment,
            from::NegativeInventoryAdjustment => to::NegativeInventoryAdjustment,
            from::ReturnReason => to::ReturnReason,
            from::RequisitionLineVariance => to::RequisitionLineVariance,
        }
    }

    pub fn to_domain(self) -> ReasonOptionType {
        use ReasonOptionNodeType as from;
        use ReasonOptionType as to;

        match self {
            from::PositiveInventoryAdjustment => to::PositiveInventoryAdjustment,
            from::NegativeInventoryAdjustment => to::NegativeInventoryAdjustment,
            from::ReturnReason => to::ReturnReason,
            from::RequisitionLineVariance => to::RequisitionLineVariance,
        }
    }
}

impl ReasonOptionConnector {
    pub fn from_domain(reason_options: ListResult<ReasonOption>) -> ReasonOptionConnector {
        ReasonOptionConnector {
            total_count: reason_options.count,
            nodes: reason_options
                .rows
                .into_iter()
                .map(|reason_option| ReasonOptionNode::from_domain(reason_option))
                .collect(),
        }
    }
}
