use async_graphql::*;
use chrono::NaiveDateTime;
use graphql_core::simple_generic_errors::NodeError;
use repository::sync_file_reference::SyncFileReference;
use service::{usize_to_u32, ListResult};

#[derive(PartialEq, Debug)]
pub struct SyncFileReferenceNode {
    pub sync_file_reference: SyncFileReference,
}

#[derive(SimpleObject)]
pub struct SyncFileReferenceConnector {
    total_count: u32,
    nodes: Vec<SyncFileReferenceNode>,
}

#[Object]
impl SyncFileReferenceNode {
    pub async fn id(&self) -> &str {
        &self.row().sync_file_reference_row.id
    }

    pub async fn table_name(&self) -> &str {
        &self.row().sync_file_reference_row.table_name
    }

    pub async fn record_id(&self) -> &str {
        &self.row().sync_file_reference_row.record_id
    }

    pub async fn file_name(&self) -> &str {
        &self.row().sync_file_reference_row.file_name
    }

    pub async fn mime_type(&self) -> &Option<String> {
        &self.row().sync_file_reference_row.mime_type
    }

    pub async fn created_datetime(&self) -> &NaiveDateTime {
        &self.row().sync_file_reference_row.created_datetime
    }
}

#[derive(Union)]
pub enum SyncFileReferencesResponse {
    Response(SyncFileReferenceConnector),
}

#[derive(Union)]
pub enum SyncFileReferenceResponse {
    Error(NodeError),
    Response(SyncFileReferenceNode),
}

impl SyncFileReferenceNode {
    pub fn from_domain(sync_file_reference: SyncFileReference) -> SyncFileReferenceNode {
        SyncFileReferenceNode {
            sync_file_reference,
        }
    }

    pub fn row(&self) -> &SyncFileReference {
        &self.sync_file_reference
    }
}

impl SyncFileReferenceConnector {
    pub fn from_domain(
        sync_file_references: ListResult<SyncFileReference>,
    ) -> SyncFileReferenceConnector {
        SyncFileReferenceConnector {
            total_count: sync_file_references.count,
            nodes: sync_file_references
                .rows
                .into_iter()
                .map(SyncFileReferenceNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(sync_file_references: Vec<SyncFileReference>) -> SyncFileReferenceConnector {
        SyncFileReferenceConnector {
            total_count: usize_to_u32(sync_file_references.len()),
            nodes: sync_file_references
                .into_iter()
                .map(SyncFileReferenceNode::from_domain)
                .collect(),
        }
    }
}
