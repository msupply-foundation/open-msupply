use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    site::clear_hardware_id::ClearSiteHardwareIdError,
};

pub struct ClearSiteHardwareIdNode {
    pub id: i32,
}

#[Object]
impl ClearSiteHardwareIdNode {
    pub async fn id(&self) -> i32 {
        self.id
    }
}

pub fn clear_site_hardware_id(ctx: &Context<'_>, site_id: i32) -> Result<ClearSiteHardwareIdNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateSites,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_povider = ctx.service_provider();
    let service_context = service_povider.basic_context()?;

    let id = service_povider
        .site_service
        .clear_site_hardware_id(&service_context, site_id)
        .map_err(map_error)?;

    Ok(ClearSiteHardwareIdNode { id })
}

fn map_error(error: ClearSiteHardwareIdError) -> async_graphql::Error {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ClearSiteHardwareIdError::SiteDoesNotExist => BadUserInput(formatted_error),
        ClearSiteHardwareIdError::SameSite => BadUserInput(formatted_error),
        ClearSiteHardwareIdError::SiteIsNotV7 => BadUserInput(formatted_error),
        ClearSiteHardwareIdError::DatabaseError(_) => InternalError(formatted_error),
    };

    graphql_error.extend()
}
