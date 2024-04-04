use async_graphql::*;
use repository::{return_reason::ReturnReason, ReturnReasonRow};
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct ReturnReasonNode {
    return_reason: ReturnReason,
}

#[derive(SimpleObject)]
pub struct ReturnReasonConnector {
    total_count: u32,
    nodes: Vec<ReturnReasonNode>,
}

#[Object]
impl ReturnReasonNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn is_active(&self) -> &bool {
        &self.row().is_active
    }

    pub async fn reason(&self) -> &str {
        &self.row().reason
    }
}

impl ReturnReasonNode {
    pub fn from_domain(return_reason: ReturnReason) -> Self {
        ReturnReasonNode { return_reason }
    }

    pub fn row(&self) -> &ReturnReasonRow {
        &self.return_reason.return_reason_row
    }
}

impl ReturnReasonConnector {
    pub fn from_domain(return_reasons: ListResult<ReturnReason>) -> ReturnReasonConnector {
        ReturnReasonConnector {
            total_count: return_reasons.count,
            nodes: return_reasons
                .rows
                .into_iter()
                .map(|return_reason| ReturnReasonNode::from_domain(return_reason))
                .collect(),
        }
    }
}
