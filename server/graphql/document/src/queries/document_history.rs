use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};
use service::document::document_service::{
    DocumentHistoryError, DocumentService, DocumentServiceTrait,
};
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

    let documents = service
        .get_document_history(&context, &store_id, &document_name)
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
            .map(|document| DocumentNode { document })
            .collect(),
    }))
}
