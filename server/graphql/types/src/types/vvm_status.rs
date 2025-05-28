use async_graphql::{Object, SimpleObject, Union};
use repository::vvm_status::vvm_status_row::VVMStatusRow;

#[derive(PartialEq, Debug)]
pub struct VVMStatusNode {
    vvm_status: VVMStatusRow,
}

#[Object]
impl VVMStatusNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn description(&self) -> &str {
        &self.row().description
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn level(&self) -> &i32 {
        &self.row().level
    }

    pub async fn is_active(&self) -> &bool {
        &self.row().is_active
    }

    pub async fn unusable(&self) -> &bool {
        &self.row().unusable
    }

    pub async fn reason_id(&self) -> Option<&str> {
        self.row().reason_id.as_deref()
    }
}

impl VVMStatusNode {
    pub fn from_domain(vvm_status: VVMStatusRow) -> VVMStatusNode {
        VVMStatusNode { vvm_status }
    }

    pub fn row(&self) -> &VVMStatusRow {
        &self.vvm_status
    }
}

#[derive(SimpleObject)]
pub struct VVMStatusConnector {
    nodes: Vec<VVMStatusNode>,
}

impl VVMStatusConnector {
    pub fn from_domain(vvm_statuses: Vec<VVMStatusRow>) -> VVMStatusConnector {
        VVMStatusConnector {
            nodes: vvm_statuses
                .into_iter()
                .map(VVMStatusNode::from_domain)
                .collect(),
        }
    }
}

#[derive(Union)]
pub enum VVMStatusesResponse {
    Response(VVMStatusConnector),
}
