use async_graphql::{Context, Result};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};

use crate::types::contact::{ContactConnector, ContactsResponse};

pub async fn contacts(
    ctx: &Context<'_>,
    store_id: String,
    name_id: &str,
) -> Result<ContactsResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryContact,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let name_id = name_id.to_string();

    let result = tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
        let service_context = service_provider.context(store_id, user.user_id)?;
        service_provider
            .contact_service
            .contacts(&service_context.connection, &name_id)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(ContactsResponse::Response(ContactConnector::from_domain(
        result,
    )))
}
