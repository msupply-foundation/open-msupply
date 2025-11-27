use async_graphql::{Context, Result};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};

use crate::print::{PrintReportNode, PrintReportResponse};

pub async fn csv_to_excel(
    ctx: &Context<'_>,
    store_id: String,
    csv_data: String,
    filename: String,
) -> Result<PrintReportResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::Report,
            store_id: Some(store_id),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service = &service_provider.report_service;

    match service.csv_to_excel(&ctx.get_settings().server.base_dir, &csv_data, &filename) {
        Ok(file_id) => Ok(PrintReportResponse::Response(PrintReportNode { file_id })),
        Err(err) => Err(StandardGraphqlError::InternalError(format!(
            "Failed to convert CSV to Excel: {err:?}"
        ))
        .into()),
    }
}
