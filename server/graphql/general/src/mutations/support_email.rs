use async_graphql::*;

use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(InputObject)]
pub struct UpdateSupportEmailInput {
    /// The support email address to send bug reports to; null (or empty)
    /// clears it, falling back to the built-in support address
    pub email: Option<String>,
}

#[derive(SimpleObject)]
pub struct UpdateSupportEmailSuccess {
    pub success: bool,
}

#[derive(Union)]
pub enum UpdateSupportEmailResponse {
    Response(UpdateSupportEmailSuccess),
}

pub fn update_support_email(
    ctx: &Context<'_>,
    input: UpdateSupportEmailInput,
) -> Result<UpdateSupportEmailResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::NoPermissionRequired,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    service_provider
        .support_email_service
        .update_support_email(&service_context, input.email)
        .map_err(async_graphql::Error::from)?;

    Ok(UpdateSupportEmailResponse::Response(
        UpdateSupportEmailSuccess { success: true },
    ))
}
