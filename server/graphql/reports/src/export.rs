use actix_web::web::Data;
use async_graphql::{Context, Result};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};
use service::service_provider::ServiceProvider;

use crate::print::{PrintReportNode, PrintReportResponse};

pub async fn csv_to_excel(
    ctx: &Context<'_>,
    store_id: String,
    csv_data: String,
    filename: String,
    sheet_name: Option<String>,
) -> Result<PrintReportResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::Report,
            store_id: Some(store_id),
            require_central_standalone: false,
        },
    )?;

    // Writing the workbook is CPU bound and sync. Under HTTP/2 a client has a single connection
    // pinned to one actix worker, so occupying that worker's runtime thread stalls every other
    // request the client makes - run it on the blocking pool instead (#12710).
    let service_provider = ctx.data_unchecked::<Data<ServiceProvider>>().clone();
    let base_dir = ctx.get_settings().server.base_dir.clone();

    let result = tokio::task::spawn_blocking(move || {
        service_provider.report_service.csv_to_excel(
            &base_dir,
            &csv_data,
            &filename,
            sheet_name.as_deref(),
        )
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?;

    match result {
        Ok(file_id) => Ok(PrintReportResponse::Response(PrintReportNode { file_id })),
        Err(err) => Err(StandardGraphqlError::InternalError(format!(
            "Failed to convert CSV to Excel: {err:?}"
        ))
        .into()),
    }
}
