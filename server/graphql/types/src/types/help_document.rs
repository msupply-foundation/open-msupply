use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::{
    generic_filters::EqualFilterStringInput, loader::SyncFileReferenceLoader, ContextExt,
};
use repository::{EqualFilter, HelpDocument, HelpDocumentFilter};
use service::ListResult;

use crate::types::SyncFileReferenceConnector;

#[derive(InputObject, Clone)]
pub struct HelpDocumentFilterInput {
    pub id: Option<EqualFilterStringInput>,
}

impl From<HelpDocumentFilterInput> for HelpDocumentFilter {
    fn from(f: HelpDocumentFilterInput) -> Self {
        HelpDocumentFilter {
            id: f.id.map(EqualFilter::from),
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct HelpDocumentNode {
    pub help_document: HelpDocument,
}

#[derive(SimpleObject)]
pub struct HelpDocumentConnector {
    total_count: u32,
    nodes: Vec<HelpDocumentNode>,
}

#[Object]
impl HelpDocumentNode {
    pub async fn id(&self) -> &str {
        &self.help_document.help_document_row.id
    }

    pub async fn title(&self) -> &str {
        &self.help_document.help_document_row.title
    }

    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(
            self.help_document.help_document_row.created_datetime,
            Utc,
        )
    }

    /// Files attached to this help document via sync_file_reference. Typically one,
    /// but the field returns a connector so the schema doesn't force the contract.
    /// Batched through the shared loader (keyed by record_id) to avoid an N+1 when
    /// listing — same path as purchase order / requisition attachments.
    pub async fn files(&self, ctx: &Context<'_>) -> Result<SyncFileReferenceConnector> {
        let loader = ctx.get_loader::<DataLoader<SyncFileReferenceLoader>>();
        let files = loader
            .load_one(self.help_document.help_document_row.id.clone())
            .await?
            .unwrap_or_default();

        Ok(SyncFileReferenceConnector::from_vec(files))
    }
}

#[derive(Union)]
pub enum HelpDocumentsResponse {
    Response(HelpDocumentConnector),
}

impl HelpDocumentNode {
    pub fn from_domain(help_document: HelpDocument) -> HelpDocumentNode {
        HelpDocumentNode { help_document }
    }
}

impl HelpDocumentConnector {
    pub fn from_domain(help_documents: ListResult<HelpDocument>) -> HelpDocumentConnector {
        HelpDocumentConnector {
            total_count: help_documents.count,
            nodes: help_documents
                .rows
                .into_iter()
                .map(HelpDocumentNode::from_domain)
                .collect(),
        }
    }
}
