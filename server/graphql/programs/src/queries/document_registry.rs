use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::document_registry::{
    DocumentRegistryConnector, DocumentRegistryFilterInput, DocumentRegistryNode,
    DocumentRegistrySortInput,
};
use repository::DocumentRegistryFilter;
use service::auth::{CapabilityTag, Resource, ResourceAccessRequest};
use service::usize_to_u32;

#[derive(Union)]
pub enum DocumentRegistryResponse {
    Response(DocumentRegistryConnector),
}

pub fn document_registries(
    ctx: &Context<'_>,
    filter: Option<DocumentRegistryFilterInput>,
    sort: Option<Vec<DocumentRegistrySortInput>>,
    store_id: String,
) -> Result<DocumentRegistryResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryDocumentRegistry,
            store_id: Some(store_id),
        },
    )?;
    let allowed_ctx = user.capabilities(CapabilityTag::ContextType);

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let filter = filter
        .map(|f| f.to_domain())
        .unwrap_or(DocumentRegistryFilter::new());

    let entries = service_provider
        .document_registry_service
        .get_entries(
            &context,
            Some(filter),
            sort.and_then(|mut sort_list| sort_list.pop())
                .map(|sort| sort.to_domain()),
            &allowed_ctx,
        )
        .map_err(|err| {
            let formatted_err = format! {"{:?}", err};
            StandardGraphqlError::InternalError(formatted_err).extend()
        })?;
    Ok(DocumentRegistryResponse::Response(
        DocumentRegistryConnector {
            total_count: usize_to_u32(entries.len()),
            nodes: entries
                .into_iter()
                .map(|document_registry| DocumentRegistryNode {
                    allowed_ctx: allowed_ctx.clone(),
                    document_registry,
                })
                .collect(),
        },
    ))
}
