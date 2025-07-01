use async_graphql::{Context, Result};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    contact::contact_rows,
};

use crate::types::contact_row::{ContactRowConnector, ContactRowsResponse};

pub fn contacts(ctx: &Context<'_>) -> Result<ContactRowsResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryContact,
            store_id: None,
        },
    )?;
    let connection_manager = ctx.get_connection_manager().connection()?;
    let categories =
        contact_rows(&connection_manager).map_err(StandardGraphqlError::from_repository_error)?;

    Ok(ContactRowsResponse::Response(
        ContactRowConnector::from_domain(categories),
    ))
}
