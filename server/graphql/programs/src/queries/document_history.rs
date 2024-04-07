use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::document::{DocumentConnector, DocumentNode};
use service::auth::{Resource, ResourceAccessRequest};
use service::document::document_service::DocumentHistoryError;
use service::usize_to_u32;

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
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let documents = service_provider
        .document_service
        .document_history(&context, &document_name, allowed_ctx)
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
                allowed_ctx: allowed_ctx.clone(),
                document,
            })
            .collect(),
    }))
}
