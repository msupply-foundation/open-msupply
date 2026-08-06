use async_graphql::*;
use graphql_core::ContextExt;

/// The configured support email address, None when unset (the server then
/// falls back to the built-in support address for bug report emails)
pub(crate) fn support_email(ctx: &Context<'_>) -> Result<Option<String>> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let support_email = service_provider
        .support_email_service
        .support_email(&service_context)?;

    Ok(support_email)
}
