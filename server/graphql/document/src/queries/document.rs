use async_graphql::*;
use graphql_core::generic_filters::EqualFilterStringInput;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::{DocumentFilter, EqualFilter};
use service::auth::{Resource, ResourceAccessRequest};
use service::document::document_service::{DocumentService, DocumentServiceTrait};
use service::usize_to_u32;

use crate::types::document::{DocumentConnector, DocumentNode};

#[derive(Union)]
pub enum DocumentResponse {
    Response(DocumentConnector),
}

#[derive(InputObject, Clone)]
pub struct DocumentFilterInput {
    pub store_id: Option<EqualFilterStringInput>,
    pub name: Option<EqualFilterStringInput>,
}
fn to_domain_filter(f: DocumentFilterInput) -> DocumentFilter {
    DocumentFilter {
        store_id: f.store_id.map(EqualFilter::from),
        name: f.name.map(EqualFilter::from),
    }
}

pub fn documents(
    ctx: &Context<'_>,
    store_id: String,
    filter: Option<DocumentFilterInput>,
) -> Result<DocumentResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryDocument,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.context()?;
    let service = DocumentService {};

    let nodes: Vec<DocumentNode> = service
        .get_documents(&context, &store_id, filter.map(to_domain_filter))?
        .into_iter()
        .map(|document| DocumentNode { document })
        .collect();

    Ok(DocumentResponse::Response(DocumentConnector {
        total_count: usize_to_u32(nodes.len()),
        nodes,
    }))
}
