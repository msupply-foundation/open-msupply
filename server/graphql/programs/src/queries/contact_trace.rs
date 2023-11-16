use async_graphql::*;
use graphql_core::{
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::contact_trace::{
    ContactTraceConnector, ContactTraceFilterInput, ContactTraceNode, ContactTraceResponse,
    ContactTraceSortInput,
};
use repository::PaginationOption;
use service::auth::{Resource, ResourceAccessRequest};

pub fn contact_traces(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<ContactTraceFilterInput>,
    sort: Option<ContactTraceSortInput>,
) -> Result<ContactTraceResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryContactTrace,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let result = service_provider
        .contact_trace_service
        .contact_traces(
            &context,
            page.map(PaginationOption::from),
            filter.map(|f| f.to_domain_filter()),
            sort.map(ContactTraceSortInput::to_domain),
            allowed_ctx.clone(),
        )
        .map_err(StandardGraphqlError::from_list_error)?;
    let nodes = result
        .rows
        .into_iter()
        .map(|encounter| ContactTraceNode {
            store_id: store_id.clone(),
            contact_trace: encounter,
            allowed_ctx: allowed_ctx.clone(),
        })
        .collect();

    Ok(ContactTraceResponse::Response(ContactTraceConnector {
        total_count: result.count,
        nodes,
    }))
}
