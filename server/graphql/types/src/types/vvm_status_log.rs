use super::{StockLineNode, UserNode, VVMStatusNode};
use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    loader::{StockLineByIdLoader, UserLoader, VVMStatusByIdLoader},
    ContextExt,
};
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

    pub async fn status(&self, ctx: &Context<'_>) -> Result<Option<VVMStatusNode>> {
        let loader = ctx.get_loader::<DataLoader<VVMStatusByIdLoader>>();
        let vvm_status = loader
            .load_one(self.row().status_id.clone())
            .await?
            .map(VVMStatusNode::from_domain);
        Ok(vvm_status)
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().created_datetime, Utc)
    }

    pub async fn stock_line(&self, ctx: &Context<'_>) -> Result<Option<StockLineNode>> {
        let stock_line_id = &self.row().stock_line_id;
        let loader = ctx.get_loader::<DataLoader<StockLineByIdLoader>>();
        let stock_line = loader
            .load_one(stock_line_id.clone())
            .await?
            .map(StockLineNode::from_domain);
        Ok(stock_line)
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    pub async fn user(&self, ctx: &Context<'_>) -> Result<Option<UserNode>> {
        let user_id = &self.row().created_by;
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();
        let user = loader
            .load_one(user_id.clone())
            .await?
            .map(UserNode::from_domain);
        Ok(user)
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

    pub fn from_vec(vvm_status_logs: Vec<VVMStatusLogRow>) -> VVMStatusLogConnector {
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
