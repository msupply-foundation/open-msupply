use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use graphql_types::types::document::{
    DocumentConnector, DocumentFilterInput, DocumentNode, DocumentSortInput,
};
use repository::PaginationOption;
use service::auth::{CapabilityTag, Resource, ResourceAccessRequest};

#[derive(Union)]
pub enum DocumentResponse {
    Response(DocumentConnector),
}

pub fn document(ctx: &Context<'_>, store_id: String, name: String) -> Result<Option<DocumentNode>> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryDocument,
            store_id: Some(store_id),
        },
    )?;
    let allowed_ctx = user.capabilities(CapabilityTag::ContextType);

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let node = service_provider
        .document_service
        .document(&context, &name, Some(&allowed_ctx))?
        .map(|document| DocumentNode {
            allowed_ctx: allowed_ctx.clone(),
            document,
        });

    Ok(node)
}

pub fn documents(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<DocumentFilterInput>,
    sort: Option<DocumentSortInput>,
) -> Result<DocumentResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryDocument,
            store_id: Some(store_id),
        },
    )?;
    let allowed_ctx = user.capabilities(CapabilityTag::ContextType);

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let filter = filter.map(|f| f.to_domain_filter());

    let result = service_provider
        .document_service
        .documents(
            &context,
            page.map(PaginationOption::from),
            filter,
            sort.map(DocumentSortInput::to_domain),
            Some(&allowed_ctx),
        )
        .map_err(StandardGraphqlError::from_list_error)?;

    Ok(DocumentResponse::Response(DocumentConnector {
        total_count: result.count,
        nodes: result
            .rows
            .into_iter()
            .map(|document| DocumentNode {
                allowed_ctx: allowed_ctx.clone(),
                document,
            })
            .collect(),
    }))
}
