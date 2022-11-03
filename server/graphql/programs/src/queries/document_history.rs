use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{CapabilityTag, Resource, ResourceAccessRequest};
use service::document::document_service::DocumentHistoryError;
use service::usize_to_u32;

use crate::types::document::{DocumentConnector, DocumentNode};

#[derive(Union)]
pub enum DocumentHistoryResponse {
    Response(DocumentConnector),
}

pub fn document_history(
    ctx: &Context<'_>,
    store_id: String,
    document_name: String,
) -> Result<DocumentHistoryResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryDocument,
            store_id: Some(store_id),
        },
    )?;
    let allowed_docs = user.capabilities(CapabilityTag::DocumentType);

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let documents = service_provider
        .document_service
        .get_document_history(&context, &document_name, &allowed_docs)
        .map_err(|err| {
            let formated_err = format! {"{:?}", err};
            let error = match err {
                DocumentHistoryError::DatabaseError(err) => err.into(),
                DocumentHistoryError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formated_err)
                }
            };
            error.extend()
        })?;
    Ok(DocumentHistoryResponse::Response(DocumentConnector {
        total_count: usize_to_u32(documents.len()),
        nodes: documents
            .into_iter()
            .map(|document| DocumentNode {
                allowed_docs: allowed_docs.clone(),
                document,
            })
            .collect(),
    }))
}
