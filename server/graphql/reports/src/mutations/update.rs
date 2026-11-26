use async_graphql::*;
use graphql_core::{
    ContextExt,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    report::report_service::{UpdateReport, UpdateReportError},
};
use util::format_error;

#[derive(InputObject)]
pub struct UpdateReportInput {
    pub id: String,
    pub is_active: bool,
    /// The store tags the report is displayed for on the Reports page. Applies
    /// to the report's code, so to every version of it. An empty list displays
    /// it for every store. Leave out to keep the current tags.
    pub store_tag_ids: Option<Vec<String>>,
}

#[derive(SimpleObject)]
pub struct UpdateReportNode {
    pub id: String,
    pub is_active: bool,
    pub store_tag_ids: Vec<String>,
}

pub fn update_report(ctx: &Context<'_>, input: UpdateReportInput) -> Result<UpdateReportNode> {
    let UpdateReportInput {
        id,
        is_active,
        store_tag_ids,
    } = input;

    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ConfigurePlugin,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider
        .basic_context()
        .map_err(|e| StandardGraphqlError::InternalError(format_error(&e)).extend())?;

    let updated = service_provider
        .report_service
        .update_report(
            &service_ctx,
            UpdateReport {
                id,
                is_active,
                store_tag_ids,
            },
        )
        .map_err(|e| match e {
            UpdateReportError::ReportNotFound | UpdateReportError::StoreTagNotFound(_) => {
                StandardGraphqlError::BadUserInput(format_error(&e)).extend()
            }
            UpdateReportError::NotACentralServer => {
                StandardGraphqlError::Forbidden(format_error(&e)).extend()
            }
            UpdateReportError::RepositoryError(_) => {
                StandardGraphqlError::InternalError(format_error(&e)).extend()
            }
        })?;

    Ok(UpdateReportNode {
        id: updated.row.id,
        is_active: updated.row.is_active,
        store_tag_ids: updated.store_tag_ids,
    })
}
