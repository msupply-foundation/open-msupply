use async_graphql::{Enum, Object, SimpleObject};
use chrono::NaiveDateTime;
use repository::{Log, LogRow, LogType};
use service::ListResult;

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
    InvoiceStatusShipped,
}

#[Object]
impl LogNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn log_type(&self) -> LogNodeType {
        LogNodeType::from_domain(&self.row().log_type)
    }

    pub async fn user_id(&self) -> &str {
        &self.row().user_id
    }

    pub async fn record_id(&self) -> &Option<String> {
        &self.row().record_id
    }

    pub async fn created_datetime(&self) -> &NaiveDateTime {
        &self.row().created_datetime
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
            LogType::InvoiceStatusShipped => LogNodeType::InvoiceStatusShipped,
        }
    }

    pub fn to_domain(self) -> LogType {
        match self {
            LogNodeType::UserLoggedIn => LogType::UserLoggedIn,
            LogNodeType::InvoiceCreated => LogType::InvoiceCreated,
            LogNodeType::InvoiceStatusShipped => LogType::InvoiceStatusShipped,
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
