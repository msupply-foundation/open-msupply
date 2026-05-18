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
use service::ListError;

pub async fn contact_traces(
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
    let allowed_ctx = user.capabilities().clone();

    let service_provider = ctx.service_provider_data();

    let connector = tokio::task::spawn_blocking(move || -> Result<_, ListError> {
        let context = service_provider.basic_context()?;
        let result = service_provider.contact_trace_service.contact_traces(
            &context,
            page.map(PaginationOption::from),
            filter.map(|f| f.to_domain_filter()),
            sort.map(ContactTraceSortInput::to_domain),
            allowed_ctx.clone(),
        )?;
        let nodes = result
            .rows
            .into_iter()
            .map(|encounter| ContactTraceNode {
                store_id: store_id.clone(),
                contact_trace: encounter,
                allowed_ctx: allowed_ctx.clone(),
            })
            .collect();
        Ok(ContactTraceConnector {
            total_count: result.count,
            nodes,
        })
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_list_error)?;

    Ok(ContactTraceResponse::Response(connector))
}
