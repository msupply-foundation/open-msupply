use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    loader::{StoreByIdLoader, SyncFileReferenceLoader},
    ContextExt,
};
use graphql_types::types::{StoreNode, SyncFileReferenceConnector};
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
    InProgress,
    Processed,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum SyncMessageNodeType {
    RequestFieldChange,
    SupportUpload,
    Other,
}

#[Object]
impl SyncMessageNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn to_store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();

        if let Some(to_store_id) = self.row().to_store_id.clone() {
            return Ok(loader
                .load_one(to_store_id)
                .await?
                .map(StoreNode::from_domain));
        }

        return Ok(None);
    }

    pub async fn from_store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();

        if let Some(from_store_id) = self.row().from_store_id.clone() {
            return Ok(loader
                .load_one(from_store_id)
                .await?
                .map(StoreNode::from_domain));
        }

        return Ok(None);
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

    pub async fn files(&self, ctx: &Context<'_>) -> Result<Option<SyncFileReferenceConnector>> {
        let sync_file_reference_id = &self.row().id;

        let files = ctx.get_loader::<DataLoader<SyncFileReferenceLoader>>();
        let result_option = files.load_one(sync_file_reference_id.to_string()).await?;

        let documents = SyncFileReferenceConnector::from_vec(result_option.unwrap_or(vec![]));

        Ok(Some(documents))
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
            SyncMessageRowStatus::InProgress => SyncMessageNodeStatus::New,
            SyncMessageRowStatus::Processed => SyncMessageNodeStatus::Processed,
        }
    }

    pub fn to_domain(self) -> SyncMessageRowStatus {
        match self {
            SyncMessageNodeStatus::New => SyncMessageRowStatus::New,
            SyncMessageNodeStatus::InProgress => SyncMessageRowStatus::InProgress,
            SyncMessageNodeStatus::Processed => SyncMessageRowStatus::Processed,
        }
    }
}

impl SyncMessageNodeType {
    pub fn from_domain(msg_type: &SyncMessageRowType) -> SyncMessageNodeType {
        match msg_type {
            SyncMessageRowType::RequestFieldChange => SyncMessageNodeType::RequestFieldChange,
            SyncMessageRowType::SupportUpload => SyncMessageNodeType::SupportUpload,
            SyncMessageRowType::Other(_) => SyncMessageNodeType::Other,
        }
    }

    pub fn to_domain(self) -> SyncMessageRowType {
        match self {
            SyncMessageNodeType::RequestFieldChange => SyncMessageRowType::RequestFieldChange,
            SyncMessageNodeType::SupportUpload => SyncMessageRowType::SupportUpload,
            SyncMessageNodeType::Other => SyncMessageRowType::Other("".to_string()),
        }
    }
}
