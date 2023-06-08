use async_graphql::{Context, Error};
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use service::auth::{Resource, ResourceAccessRequest};

pub fn log_file_names(ctx: &Context<'_>) -> Result<Vec<String>, Error> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryLog,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let log_service = &service_provider.log_service;
    let file_names = log_service.get_log_file_names()?;

    Ok(file_names)
}
