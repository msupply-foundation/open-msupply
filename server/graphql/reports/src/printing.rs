use async_graphql::*;
use graphql_core::generic_inputs::PrintReportSortInput;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::{ContextExt, RequestUserData};
use service::auth::{Resource, ResourceAccessRequest};
use service::report::definition::{GraphQlQuery, PrintReportSort, ReportDefinition};
use service::report::report_service::{PrintFormat, ReportError};

pub struct FailedToFetchReportData {
    errors: serde_json::Value,
}
#[Object]
impl FailedToFetchReportData {
    pub async fn description(&self) -> &str {
        "Failed to query data required for the report"
    }

    pub async fn errors(&self) -> &serde_json::Value {
        &self.errors
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum PrintReportErrorInterface {
    FailedToFetchReportData(FailedToFetchReportData),
}

#[derive(SimpleObject)]
pub struct PrintReportError {
    pub error: PrintReportErrorInterface,
}

#[derive(PartialEq, Debug)]
pub struct PrintReportNode {
    file_id: String,
}

#[Object]
impl PrintReportNode {
    /// Return the file id of the printed report.
    /// The file can be fetched using the /files?id={id} endpoint
    pub async fn file_id(&self) -> &str {
        &self.file_id
    }
}

#[derive(Union)]
pub enum PrintReportResponse {
    Error(PrintReportError),
    Response(PrintReportNode),
}

pub async fn print_report(
    ctx: &Context<'_>,
    store_id: String,
    report_id: String,
    data_id: Option<String>,
    arguments: Option<serde_json::Value>,
    format: Option<PrintFormat>,
    sort: Option<PrintReportSortInput>,
) -> Result<PrintReportResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::Report,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let sort = sort.map(|s| s.to_domain());
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;
    let service = &service_provider.report_service;

    // get the required report
    let resolved_report = match service.resolve_report(&service_context, &report_id) {
        Ok(resolved_report) => resolved_report,
        Err(err) => {
            return Ok(PrintReportResponse::Error(PrintReportError {
                error: map_error(err)?,
            }))
        }
    };
    let query = resolved_report.query.clone();

    // fetch data required for the report
    let result = fetch_data(ctx, query, &store_id, data_id, arguments.clone(), sort)
        .await
        .map_err(|err| StandardGraphqlError::InternalError(format!("{:#?}", err)))?;
    let report_data = match result {
        FetchResult::Data(data) => data,
        FetchResult::Error(errors) => {
            return Ok(PrintReportResponse::Error(PrintReportError {
                error: PrintReportErrorInterface::FailedToFetchReportData(
                    FailedToFetchReportData { errors },
                ),
            }))
        }
    };

    // print the report with the fetched data
    let file_id = match service.print_html_report(
        &ctx.get_settings().server.base_dir,
        &resolved_report,
        report_data,
        arguments,
        format,
    ) {
        Ok(file_id) => file_id,
        Err(err) => {
            return Ok(PrintReportResponse::Error(PrintReportError {
                error: map_error(err)?,
            }))
        }
    };

    Ok(PrintReportResponse::Response(PrintReportNode { file_id }))
}

pub async fn print_report_definition(
    ctx: &Context<'_>,
    store_id: String,
    name: Option<String>,
    report: serde_json::Value,
    data_id: Option<String>,
    arguments: Option<serde_json::Value>,
) -> Result<PrintReportResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::Report,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;
    let service = &service_provider.report_service;

    // get the required report
    let report_definition: ReportDefinition = serde_json::from_value(report)
        .map_err(|err| StandardGraphqlError::BadUserInput(format!("{}", err)).extend())?;
    let resolved_report = match service.resolve_report_definition(
        &service_context,
        name.unwrap_or("report".to_string()),
        report_definition,
    ) {
        Ok(resolved_report) => resolved_report,
        Err(err) => {
            return Ok(PrintReportResponse::Error(PrintReportError {
                error: map_error(err)?,
            }))
        }
    };
    let query = resolved_report.query.clone();

    // fetch data required for the report
    let result = fetch_data(ctx, query, &store_id, data_id, arguments.clone(), None)
        .await
        .map_err(|err| StandardGraphqlError::InternalError(format!("{:#?}", err)))?;
    let report_data = match result {
        FetchResult::Data(data) => data,
        FetchResult::Error(errors) => {
            return Ok(PrintReportResponse::Error(PrintReportError {
                error: PrintReportErrorInterface::FailedToFetchReportData(
                    FailedToFetchReportData { errors },
                ),
            }))
        }
    };

    // print the report with the fetched data
    let file_id = match service.print_html_report(
        &ctx.get_settings().server.base_dir,
        &resolved_report,
        report_data,
        arguments,
        None,
    ) {
        Ok(file_id) => file_id,
        Err(err) => {
            return Ok(PrintReportResponse::Error(PrintReportError {
                error: map_error(err)?,
            }))
        }
    };

    Ok(PrintReportResponse::Response(PrintReportNode { file_id }))
}

enum FetchResult {
    Data(serde_json::Value),
    Error(serde_json::Value),
}

async fn fetch_data(
    ctx: &Context<'_>,
    query: GraphQlQuery,
    store_id: &str,
    data_id: Option<String>,
    arguments: Option<serde_json::Value>,
    sort: Option<PrintReportSort>,
) -> anyhow::Result<FetchResult> {
    let user_data = ctx.data_unchecked::<RequestUserData>().clone();
    let self_requester = ctx.self_request().unwrap();
    let variables =
        serde_json::from_value(query.query_variables(store_id, data_id, arguments, sort))?;
    let request = Request::new(query.query).variables(variables);
    let response = self_requester.call(request, user_data).await;
    if !response.errors.is_empty() {
        return Ok(FetchResult::Error(serde_json::to_value(&response.errors)?));
    }
    Ok(FetchResult::Data(response.data.into_json()?))
}

fn map_error(error: ReportError) -> Result<PrintReportErrorInterface> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ReportError::RepositoryError(_) => StandardGraphqlError::InternalError(formatted_error),
        ReportError::ReportDefinitionNotFound {
            report_id: _,
            msg: _,
        } => StandardGraphqlError::BadUserInput(formatted_error),
        ReportError::TemplateNotSpecified => StandardGraphqlError::BadUserInput(formatted_error),
        ReportError::QueryNotSpecified => StandardGraphqlError::BadUserInput(formatted_error),
        ReportError::InvalidReportDefinition(_) => {
            StandardGraphqlError::InternalError(formatted_error)
        }
        ReportError::QueryError(_) => StandardGraphqlError::InternalError(formatted_error),
        ReportError::DocGenerationError(_) => StandardGraphqlError::InternalError(formatted_error),
        ReportError::HTMLToPDFError(_) => StandardGraphqlError::InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
