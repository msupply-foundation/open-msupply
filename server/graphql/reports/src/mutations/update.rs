use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    report::report_service::UpdateReportError,
};
use util::format_error;

#[derive(SimpleObject)]
pub struct UpdateReportNode {
    pub id: String,
    pub is_active: bool,
}

pub fn update_report(
    ctx: &Context<'_>,
    id: String,
    is_active: bool,
) -> Result<UpdateReportNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ConfigurePlugin,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider
        .basic_context()
        .map_err(|e| StandardGraphqlError::InternalError(format_error(&e)).extend())?;

    let row = service_provider
        .report_service
        .update_report(&service_ctx, &id, is_active)
        .map_err(|e| match e {
            UpdateReportError::ReportNotFound => {
                StandardGraphqlError::BadUserInput(format_error(&e)).extend()
            }
            UpdateReportError::RepositoryError(_) => {
                StandardGraphqlError::InternalError(format_error(&e)).extend()
            }
        })?;

    Ok(UpdateReportNode {
        id: row.id,
        is_active: row.is_active,
    })
}
