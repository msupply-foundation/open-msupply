use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::usize_to_u32;
use service::{
    auth::{Resource, ResourceAccessRequest},
    document::document_registry::DocumentRegistryError,
};

use crate::types::document_registry::{DocumentRegistryConnector, DocumentRegistryNode};

#[derive(Union)]
pub enum DocumentRegistryResponse {
    Response(DocumentRegistryConnector),
}

pub fn document_registry(ctx: &Context<'_>) -> Result<DocumentRegistryResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryDocumentRegistry,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.context()?;

    let entries = service_provider
        .document_registry_service
        .get_entries(&context)
        .map_err(|err| {
            let formated_err = format! {"{:?}", err};
            let error = match err {
                DocumentRegistryError::InternalError(_) => {
                    StandardGraphqlError::InternalError(formated_err)
                }
                DocumentRegistryError::RepositoryError(_) => {
                    StandardGraphqlError::InternalError(formated_err)
                }
            };
            error.extend()
        })?;
    Ok(DocumentRegistryResponse::Response(
        DocumentRegistryConnector {
            total_count: usize_to_u32(entries.len()),
            nodes: entries
                .into_iter()
                .map(|document_registry| DocumentRegistryNode { document_registry })
                .collect(),
        },
    ))
}
