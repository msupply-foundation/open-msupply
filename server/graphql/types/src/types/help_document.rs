use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::{generic_filters::EqualFilterStringInput, ContextExt};
use repository::{EqualFilter, HelpDocument, HelpDocumentFilter, SyncFileReference};
use service::{usize_to_u32, ListResult};

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
    pub async fn files(&self, ctx: &Context<'_>) -> Result<SyncFileReferenceConnector> {
        let service_provider = ctx.service_provider();
        let service_context = service_provider.basic_context()?;
        let connection = &service_context.connection;
        let id = &self.help_document.help_document_row.id;

        let result: Vec<SyncFileReference> =
            repository::SyncFileReferenceRepository::new(connection)
                .query_by_filter(
                    repository::SyncFileReferenceFilter::new()
                        .table_name(EqualFilter::equal_to("help_document".to_string()))
                        .record_id(EqualFilter::equal_to(id.to_string()))
                        .is_deleted(false),
                )?;

        Ok(SyncFileReferenceConnector::from_vec(result))
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

    pub fn from_vec(help_documents: Vec<HelpDocument>) -> HelpDocumentConnector {
        HelpDocumentConnector {
            total_count: usize_to_u32(help_documents.len()),
            nodes: help_documents
                .into_iter()
                .map(HelpDocumentNode::from_domain)
                .collect(),
        }
    }
}
