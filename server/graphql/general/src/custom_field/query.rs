use async_graphql::*;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::ContextExt;
use graphql_types::types::{CustomFieldConnector, CustomFieldsResponse};
use service::auth::{Resource, ResourceAccessRequest};

pub fn custom_field_scope_config(
    ctx: &Context<'_>,
    scope: String,
) -> Result<CustomFieldsResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryCustomFieldConfig,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .custom_field_service
        .get_custom_field_scope_config(&service_context, &scope)
        .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(CustomFieldsResponse::Response(
        CustomFieldConnector::from_domain(result),
    ))
}
