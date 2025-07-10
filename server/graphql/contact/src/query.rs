use async_graphql::{Context, Result};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};

use crate::types::contact::{ContactConnector, ContactsResponse};

pub fn contacts(ctx: &Context<'_>, store_id: String, name_id: &str) -> Result<ContactsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryContact,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let result = service_provider
        .contact_service
        .contacts(&service_context.connection, name_id)
        .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(ContactsResponse::Response(ContactConnector::from_domain(
        result,
    )))
}
