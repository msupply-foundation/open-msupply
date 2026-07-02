use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{
    HelpDocumentConnector, HelpDocumentFilterInput, HelpDocumentsResponse,
};
use repository::{HelpDocumentFilter, PaginationOption};
use service::{
    auth::{Resource, ResourceAccessRequest},
    help_document::get_help_documents as service_get_help_documents,
};

pub async fn get_help_documents(
    ctx: &Context<'_>,
    page: Option<PaginationInput>,
    filter: Option<HelpDocumentFilterInput>,
) -> Result<HelpDocumentsResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryHelpDocuments,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let pagination = page.map(PaginationOption::from);
    let service_context = service_provider.basic_context()?;

    let result = service_get_help_documents(
        &service_context,
        pagination,
        filter.map(HelpDocumentFilter::from),
        None,
    )
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(HelpDocumentsResponse::Response(
        HelpDocumentConnector::from_domain(result),
    ))
}
