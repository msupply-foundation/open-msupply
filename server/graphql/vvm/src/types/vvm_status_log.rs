use async_graphql::*;
use chrono::NaiveDateTime;
use repository::vvm_status::vvm_status_log_row::VVMStatusLogRow;
use service::vvm::vvm_status_log::insert::InsertVVMStatusLogInput as ServiceInput;

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

    pub async fn created_datetime(&self) -> NaiveDateTime {
        self.row().created_datetime
    }

    pub async fn stock_line_id(&self) -> &str {
        &self.row().stock_line_id
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    pub async fn created_by(&self) -> &str {
        &self.row().created_by
    }

    pub async fn invoice_line_id(&self) -> &Option<String> {
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

#[derive(InputObject)]
#[graphql(name = "InsertVVMStatusLogInput")]
pub struct InsertInput {
    pub id: String,
    pub status_id: String,
    pub stock_line_id: String,
    pub comment: Option<String>,
    pub invoice_line_id: String,
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            status_id,
            stock_line_id,
            comment,
            invoice_line_id,
        } = self;

        ServiceInput {
            id,
            status_id,
            stock_line_id,
            comment,
            invoice_line_id: Some(invoice_line_id),
        }
    }
}

#[derive(Union)]
#[graphql(name = "InsertVVMStatusLogResponse")]
pub enum InsertResponse {
    Response(VVMStatusLogNode),
}
