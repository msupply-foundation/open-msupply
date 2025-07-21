use async_graphql::Context;
use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use service::{
    auth::{Resource, ResourceAccessRequest},
    UploadedFile,
};
use util::format_error;

pub fn install_uploaded_reports(ctx: &Context<'_>, file_id: String) -> Result<Vec<String>> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ConfigurePlugin,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let settings = ctx.get_settings();

    service_provider
        .report_service
        .install_uploaded_reports(settings, UploadedFile { file_id })
        .map_err(|e| StandardGraphqlError::InternalError(format_error(&e)).extend())
}
