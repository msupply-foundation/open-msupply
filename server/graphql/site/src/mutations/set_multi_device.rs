use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    site::set_multi_device::SetSiteMultiDeviceError as ServiceError,
};

pub struct SetSiteMultiDeviceNode {
    pub id: i32,
}

#[Object]
impl SetSiteMultiDeviceNode {
    pub async fn id(&self) -> i32 {
        self.id
    }
}

pub fn set_site_multi_device(
    ctx: &Context<'_>,
    site_id: i32,
    is_multi_device: bool,
) -> Result<SetSiteMultiDeviceNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateSites,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let id = service_provider
        .site_service
        .set_site_multi_device(&service_context, site_id, is_multi_device)
        .map_err(map_error)?;

    Ok(SetSiteMultiDeviceNode { id })
}

fn map_error(error: ServiceError) -> async_graphql::Error {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::SiteDoesNotExist => BadUserInput(formatted_error),
        ServiceError::SameSite => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    graphql_error.extend()
}
