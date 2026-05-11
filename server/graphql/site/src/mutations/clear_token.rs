use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    site::clear_token::ClearSiteTokenError as ServiceError,
};

pub struct ClearSiteTokenNode {
    pub id: i32,
}

#[Object]
impl ClearSiteTokenNode {
    pub async fn id(&self) -> i32 {
        self.id
    }
}

pub fn clear_site_token(ctx: &Context<'_>, site_id: i32) -> Result<ClearSiteTokenNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateSites,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let id = service_provider
        .site_service
        .clear_site_token(&service_context, site_id)
        .map_err(map_error)?;

    Ok(ClearSiteTokenNode { id })
}

fn map_error(error: ServiceError) -> async_graphql::Error {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::SiteDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    graphql_error.extend()
}
