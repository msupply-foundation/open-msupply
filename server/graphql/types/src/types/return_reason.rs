use async_graphql::*;
use repository::{return_reason::ReturnReason, ReasonOption, ReturnReasonRow};
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
    pub fn from_domain(reason_option: ReasonOption) -> Self {
        ReturnReasonNode {
            return_reason: ReturnReason {
                return_reason_row: ReturnReasonRow {
                    id: reason_option.reason_option_row.id,
                    is_active: reason_option.reason_option_row.is_active,
                    reason: reason_option.reason_option_row.reason,
                },
            },
        }
    }

    pub fn row(&self) -> &ReturnReasonRow {
        &self.return_reason.return_reason_row
    }
}

impl ReturnReasonConnector {
    pub fn from_domain(reason_options: ListResult<ReasonOption>) -> ReturnReasonConnector {
        ReturnReasonConnector {
            total_count: reason_options.count,
            nodes: reason_options
                .rows
                .into_iter()
                .map(ReturnReasonNode::from_domain)
                .collect(),
        }
    }
}
