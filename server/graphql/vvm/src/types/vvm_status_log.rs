use async_graphql::{Object, SimpleObject, Union};
use chrono::NaiveDateTime;
use repository::vvm_status::vvm_status_log_row::VVMStatusLogRow;

#[derive(PartialEq, Debug)]
pub struct VVMStatusLogNode {
    vvm_status_log: VVMStatusLogRow,
}

#[Object]
impl VVMStatusLogNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn status_id(&self) -> &str {
        &self.row().status_id
    }

    pub async fn datetime(&self) -> Option<NaiveDateTime> {
        self.row().datetime
    }

    pub async fn stock_line_id(&self) -> &str {
        &self.row().stock_line_id
    }

    pub async fn comment(&self) -> Option<&str> {
        self.row().comment.as_deref()
    }

    pub async fn user_id(&self) -> &str {
        &self.row().user_id
    }

    pub async fn invoice_line_id(&self) -> &str {
        &self.row().invoice_line_id
    }
}

impl VVMStatusLogNode {
    pub fn from_domain(vvm_status_log: VVMStatusLogRow) -> VVMStatusLogNode {
        VVMStatusLogNode { vvm_status_log }
    }

    pub fn row(&self) -> &VVMStatusLogRow {
        &self.vvm_status_log
    }
}

#[derive(SimpleObject)]
pub struct VVMStatusLogConnector {
    nodes: Vec<VVMStatusLogNode>,
}

impl VVMStatusLogConnector {
    pub fn from_domain(vvm_status_logs: Vec<VVMStatusLogRow>) -> VVMStatusLogConnector {
        VVMStatusLogConnector {
            nodes: vvm_status_logs
                .into_iter()
                .map(VVMStatusLogNode::from_domain)
                .collect(),
        }
    }
}

#[derive(Union)]
pub enum VVMStatusLogResponse {
    Response(VVMStatusLogConnector),
}
