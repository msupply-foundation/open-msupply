use async_graphql::{dataloader::DataLoader, *};
use chrono::NaiveDateTime;
use graphql_core::{
    loader::{StoreByIdLoader, UserLoader},
    ContextExt,
};
use repository::{unknown_user, Log, LogRow, LogType};
use service::ListResult;

use super::{StoreNode, UserNode};

#[derive(PartialEq, Debug)]
pub struct LogNode {
    log: Log,
}

#[derive(SimpleObject)]
pub struct LogConnector {
    total_count: u32,
    nodes: Vec<LogNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum LogNodeType {
    UserLoggedIn,
    InvoiceCreated,
    InvoiceStatusAllocated,
    InvoiceStatusPicked,
    InvoiceStatusShipped,
    InvoiceStatusDelivered,
    InvoiceStatusVerified,
}

#[Object]
impl LogNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn log_type(&self) -> LogNodeType {
        LogNodeType::from_domain(&self.row().log_type)
    }

    pub async fn store_id(&self) -> &Option<String> {
        &self.row().store_id
    }

    pub async fn record_id(&self) -> &Option<String> {
        &self.row().record_id
    }

    pub async fn datetime(&self) -> &NaiveDateTime {
        &self.row().datetime
    }

    pub async fn user(&self, ctx: &Context<'_>) -> Result<Option<UserNode>> {
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();

        let user_id = match &self.row().user_id {
            Some(user_id) => user_id,
            None => return Ok(None),
        };

        let result = loader
            .load_one(user_id.clone())
            .await?
            .unwrap_or(unknown_user());

        Ok(Some(UserNode::from_domain(result)))
    }

    pub async fn store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();

        let store_id = match &self.row().store_id {
            Some(store_id) => store_id,
            None => return Ok(None),
        };

        let result = loader.load_one(store_id.clone()).await?.unwrap();

        Ok(Some(StoreNode::from_domain(result)))
    }
}

impl LogNode {
    pub fn from_domain(log: Log) -> Self {
        LogNode { log }
    }

    pub fn row(&self) -> &LogRow {
        &self.log.log_row
    }
}

impl LogNodeType {
    pub fn from_domain(from: &LogType) -> LogNodeType {
        match from {
            LogType::UserLoggedIn => LogNodeType::UserLoggedIn,
            LogType::InvoiceCreated => LogNodeType::InvoiceCreated,
            LogType::InvoiceStatusAllocated => LogNodeType::InvoiceStatusAllocated,
            LogType::InvoiceStatusPicked => LogNodeType::InvoiceStatusPicked,
            LogType::InvoiceStatusShipped => LogNodeType::InvoiceStatusShipped,
            LogType::InvoiceStatusDelivered => LogNodeType::InvoiceStatusDelivered,
            LogType::InvoiceStatusVerified => LogNodeType::InvoiceStatusVerified,
        }
    }

    pub fn to_domain(self) -> LogType {
        match self {
            LogNodeType::UserLoggedIn => LogType::UserLoggedIn,
            LogNodeType::InvoiceCreated => LogType::InvoiceCreated,
            LogNodeType::InvoiceStatusAllocated => LogType::InvoiceStatusAllocated,
            LogNodeType::InvoiceStatusPicked => LogType::InvoiceStatusPicked,
            LogNodeType::InvoiceStatusShipped => LogType::InvoiceStatusShipped,
            LogNodeType::InvoiceStatusDelivered => LogType::InvoiceStatusDelivered,
            LogNodeType::InvoiceStatusVerified => LogType::InvoiceStatusVerified,
        }
    }
}

impl LogConnector {
    pub fn from_domain(logs: ListResult<Log>) -> LogConnector {
        LogConnector {
            total_count: logs.count,
            nodes: logs
                .rows
                .into_iter()
                .map(|log| LogNode::from_domain(log))
                .collect(),
        }
    }
}
