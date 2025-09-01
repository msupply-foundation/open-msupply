use async_graphql::*;
use repository::{reason_option::ReasonOption, reason_option_row::ReasonOptionRow};
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
#[graphql(remote = "repository::db_diesel::reason_option_row
::ReasonOptionType")]
pub enum ReasonOptionNodeType {
    PositiveInventoryAdjustment,
    NegativeInventoryAdjustment,
    OpenVialWastage,
    ReturnReason,
    RequisitionLineVariance,
    ClosedVialWastage,
}

#[Object]
impl ReasonOptionNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn r#type(&self) -> ReasonOptionNodeType {
        ReasonOptionNodeType::from(self.row().r#type.clone())
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

impl ReasonOptionConnector {
    pub fn from_domain(reason_options: ListResult<ReasonOption>) -> ReasonOptionConnector {
        ReasonOptionConnector {
            total_count: reason_options.count,
            nodes: reason_options
                .rows
                .into_iter()
                .map(ReasonOptionNode::from_domain)
                .collect(),
        }
    }
}
