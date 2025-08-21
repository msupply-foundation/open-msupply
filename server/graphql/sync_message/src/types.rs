use async_graphql::*;
use chrono::{DateTime, Utc};
use repository::{SyncMessageRow, SyncMessageRowStatus, SyncMessageRowType};
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct SyncMessageNode {
    pub sync_message: SyncMessageRow,
}

#[derive(SimpleObject)]
pub struct SyncMessageConnector {
    pub total_count: u32,
    pub nodes: Vec<SyncMessageNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum SyncMessageNodeStatus {
    New,
    Processed,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum SyncMessageNodeType {
    RequestFieldChange,
    Other,
}

#[Object]
impl SyncMessageNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn to_store_id(&self) -> &Option<String> {
        &self.row().to_store_id
    }

    pub async fn from_store_id(&self) -> &Option<String> {
        &self.row().from_store_id
    }

    pub async fn body(&self) -> &str {
        &self.row().body
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::from_naive_utc_and_offset(self.row().created_datetime, Utc)
    }

    pub async fn status(&self) -> SyncMessageNodeStatus {
        SyncMessageNodeStatus::from_domain(&self.row().status)
    }

    pub async fn r#type(&self) -> SyncMessageNodeType {
        SyncMessageNodeType::from_domain(&self.row().r#type)
    }

    pub async fn error_message(&self) -> &Option<String> {
        &self.row().error_message
    }
}

impl SyncMessageNode {
    pub fn from_domain(sync_message: SyncMessageRow) -> SyncMessageNode {
        SyncMessageNode { sync_message }
    }
}

impl SyncMessageNode {
    pub fn row(&self) -> &SyncMessageRow {
        &self.sync_message
    }
}

impl SyncMessageConnector {
    pub fn from_domain(results: ListResult<SyncMessageRow>) -> SyncMessageConnector {
        SyncMessageConnector {
            total_count: results.count,
            nodes: results
                .rows
                .into_iter()
                .map(SyncMessageNode::from_domain)
                .collect(),
        }
    }
}

impl SyncMessageNodeStatus {
    pub fn from_domain(status: &SyncMessageRowStatus) -> SyncMessageNodeStatus {
        match status {
            SyncMessageRowStatus::New => SyncMessageNodeStatus::New,
            SyncMessageRowStatus::Processed => SyncMessageNodeStatus::Processed,
        }
    }

    pub fn to_domain(self) -> SyncMessageRowStatus {
        match self {
            SyncMessageNodeStatus::New => SyncMessageRowStatus::New,
            SyncMessageNodeStatus::Processed => SyncMessageRowStatus::Processed,
        }
    }
}

impl SyncMessageNodeType {
    pub fn from_domain(msg_type: &SyncMessageRowType) -> SyncMessageNodeType {
        match msg_type {
            SyncMessageRowType::RequestFieldChange => SyncMessageNodeType::RequestFieldChange,
            SyncMessageRowType::Other(_) => SyncMessageNodeType::Other,
        }
    }

    pub fn to_domain(self) -> SyncMessageRowType {
        match self {
            SyncMessageNodeType::RequestFieldChange => SyncMessageRowType::RequestFieldChange,
            SyncMessageNodeType::Other => SyncMessageRowType::Other("".to_string()),
        }
    }
}
