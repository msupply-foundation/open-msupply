use actix_web::web::Data;
use async_graphql::*;
use chrono::Utc;
use graphql_core::generic_inputs::PrintReportSortInput;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use graphql_core::{ContextExt, RequestUserData};
use repository::{ReportQueryExecutor, ReportSqlQuery, StoreRowRepository};
use service::auth::{Resource, ResourceAccessRequest};
use service::report::definition::{GraphQlQuery, PrintReportSort, ReportDefinition};
use service::report::report_service::{ReportError, ResolvedReportQuery};
use service::service_provider::ServiceProvider;

use crate::PrintFormat;

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
#[graphql(field(name = "description", ty = "String"))]
pub enum PrintReportErrorInterface {
    FailedToFetchReportData(FailedToFetchReportData),
}

#[derive(SimpleObject)]
pub struct PrintReportError {
    pub error: PrintReportErrorInterface,
}

#[derive(PartialEq, Debug)]
pub struct PrintReportNode {
    pub(crate) file_id: String,
}

#[Object]
impl PrintReportNode {
    /// Return the file id of the generated report.
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

pub async fn generate_report(
    ctx: &Context<'_>,
    store_id: String,
    report_id: String,
    data_id: Option<String>,
    arguments: Option<serde_json::Value>,
    format: Option<PrintFormat>,
    sort: Option<PrintReportSortInput>,
    current_language: Option<String>,
) -> Result<PrintReportResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::Report,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;

    let sort = sort.map(|s| s.to_domain());
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;
    let service = &service_provider.report_service;
    let localisations = service_provider
        .localisations_service
        .get_localisations(&service_context.connection)?;

    // get the required report
    let resolved_report = match service.resolve_report(&service_context, &report_id) {
        Ok(resolved_report) => resolved_report,
        Err(err) => {
            return Ok(PrintReportResponse::Error(PrintReportError {
                error: map_error(err)?,
            }))
        }
    };

    // fetch data required for the report
    let result = fetch_data(
        ctx,
        &resolved_report.queries,
        &store_id,
        data_id,
        arguments.clone(),
        sort,
    )
    .await
    .map_err(|err| StandardGraphqlError::InternalError(format!("{err:#?}")).extend())?;
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
    // Look up the current store's code so it can be included in the download
    // filename (best effort — a missing store just omits the prefix).
    let store_code = store_code(&service_context, &store_id)?;

    // Nothing below needs the database, and generation can take tens of seconds, so hand the
    // pooled connection back before starting it.
    drop(service_context);

    // Generation is CPU bound (BoaJs `convert_data`, Tera render, Excel/PDF conversion) and the
    // service method is sync. Under HTTP/2 a client has a single connection pinned to one actix
    // worker, so occupying that worker's runtime thread freezes every other request the client
    // makes for the whole generation - run it on the blocking pool instead (#12710).
    let service_provider = ctx.data_unchecked::<Data<ServiceProvider>>().clone();
    let base_dir = ctx.get_settings().server.base_dir.clone();
    let format = format.map(PrintFormat::to_domain);

    // generate the report with the fetched data
    let generated = tokio::task::spawn_blocking(move || {
        service_provider.report_service.generate_html_report(
            &base_dir,
            &resolved_report,
            report_data,
            arguments,
            format,
            &localisations,
            current_language,
            store_code.as_deref(),
        )
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?;

    let file_id = match generated {
        Ok(file_id) => file_id,
        Err(err) => {
            return Ok(PrintReportResponse::Error(PrintReportError {
                error: map_error(err)?,
            }))
        }
    };

    Ok(PrintReportResponse::Response(PrintReportNode { file_id }))
}

pub async fn generate_report_definition(
    ctx: &Context<'_>,
    store_id: String,
    name: Option<String>,
    report: serde_json::Value,
    data_id: Option<String>,
    arguments: Option<serde_json::Value>,
    format: Option<PrintFormat>,
    current_language: Option<String>,
    excel_template_buffer: Option<Vec<u8>>,
) -> Result<PrintReportResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ReportDev,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;
    let service = &service_provider.report_service;
    let localisations = service_provider
        .localisations_service
        .get_localisations(&service_context.connection)?;

    // get the required report
    let report_definition: ReportDefinition = serde_json::from_value(report)
        .map_err(|err| StandardGraphqlError::BadUserInput(format!("{err}")).extend())?;
    let resolved_report = match service.resolve_report_definition(
        &service_context,
        name.unwrap_or("report".to_string()),
        report_definition,
        excel_template_buffer,
    ) {
        Ok(resolved_report) => resolved_report,
        Err(err) => {
            return Ok(PrintReportResponse::Error(PrintReportError {
                error: map_error(err)?,
            }))
        }
    };

    // fetch data required for the report
    let result = fetch_data(
        ctx,
        &resolved_report.queries,
        &store_id,
        data_id,
        arguments.clone(),
        None,
    )
    .await
    .map_err(|err| StandardGraphqlError::InternalError(format!("{err:#?}")).extend())?;
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

    let store_code = store_code(&service_context, &store_id)?;

    // Nothing below needs the database, and generation can take tens of seconds, so hand the
    // pooled connection back before starting it.
    drop(service_context);

    // Generation is CPU bound (BoaJs `convert_data`, Tera render, Excel/PDF conversion) and the
    // service method is sync. Under HTTP/2 a client has a single connection pinned to one actix
    // worker, so occupying that worker's runtime thread freezes every other request the client
    // makes for the whole generation - run it on the blocking pool instead (#12710).
    let service_provider = ctx.data_unchecked::<Data<ServiceProvider>>().clone();
    let base_dir = ctx.get_settings().server.base_dir.clone();
    let format = format.map(PrintFormat::to_domain);

    // generate the report with the fetched data
    let generated = tokio::task::spawn_blocking(move || {
        service_provider.report_service.generate_html_report(
            &base_dir,
            &resolved_report,
            report_data,
            arguments,
            format,
            &localisations,
            current_language,
            store_code.as_deref(),
        )
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?;

    let file_id = match generated {
        Ok(file_id) => file_id,
        Err(err) => {
            return Ok(PrintReportResponse::Error(PrintReportError {
                error: map_error(err)?,
            }))
        }
    };

    Ok(PrintReportResponse::Response(PrintReportNode { file_id }))
}

/// Fetch the store's code for use in report download filenames.
fn store_code(
    service_context: &service::service_provider::ServiceContext,
    store_id: &str,
) -> Result<Option<String>> {
    let store = StoreRowRepository::new(&service_context.connection)
        .find_one_by_id(store_id)
        .map_err(|err| StandardGraphqlError::InternalError(format!("{err:#?}")).extend())?;
    Ok(store.map(|store| store.code))
}

enum FetchResult {
    Data(serde_json::Value),
    Error(serde_json::Value),
}

/// Create query variables for the query
/// * `query_variables` Some variables that came with the query
fn query_variables(
    store_id: &str,
    data_id: &Option<String>,
    arguments: &Option<serde_json::Value>,
    sort: &Option<PrintReportSort>,
    query_variables: &Option<serde_json::Value>,
) -> serde_json::Map<String, serde_json::Value> {
    let mut variables = match query_variables {
        Some(variables) => {
            if let serde_json::Value::Object(variables) = variables {
                variables.clone()
            } else {
                // ensure variables are an object
                serde_json::Map::new()
            }
        }
        None => serde_json::Map::new(),
    };

    if let Some(data_id) = data_id {
        variables.insert(
            "dataId".to_string(),
            serde_json::Value::String(data_id.clone()),
        );
    }
    // allow the arguments to overwrite the dataId but not the storeId (to reduce the attack
    // vector)
    if let Some(serde_json::Value::Object(arguments)) = arguments {
        for (key, value) in arguments {
            variables.insert(key.clone(), value.clone());
        }
    };

    if let Some(sort) = sort {
        variables.insert(
            "sort".to_string(),
            serde_json::json!({
                "key": sort.key,
                "desc": sort.desc
            }),
        );
    }

    variables.insert(
        "storeId".to_string(),
        serde_json::Value::String(store_id.to_string()),
    );
    variables.insert(
        "now".to_string(),
        serde_json::Value::String(Utc::now().to_rfc3339()),
    );

    variables
}

async fn fetch_data(
    ctx: &Context<'_>,
    queries: &Vec<ResolvedReportQuery>,
    store_id: &str,
    data_id: Option<String>,
    arguments: Option<serde_json::Value>,
    sort: Option<PrintReportSort>,
) -> anyhow::Result<FetchResult> {
    let graphql_query: Vec<_> = queries
        .iter()
        .filter(|query| matches!(query, ResolvedReportQuery::GraphQlQuery(_)))
        .collect();
    if graphql_query.len() > 1 {
        return Err(anyhow::Error::msg("Only one GraphQL query supported"));
    }
    let mut data = if let Some(ResolvedReportQuery::GraphQlQuery(gql)) = graphql_query.first() {
        let variables = query_variables(store_id, &data_id, &arguments, &sort, &gql.variables);
        let result = fetch_graphql_data(ctx, gql, variables).await?;
        match result {
            FetchResult::Data(serde_json::Value::Object(data)) => data,
            FetchResult::Error(_) => return Ok(result),
            _ => {
                return Err(anyhow::Error::msg(
                    "Unexpected GraphQL response type (object expected)",
                ))
            }
        }
    } else {
        serde_json::Map::new()
    };

    let sql_queries: Vec<ReportSqlQuery> = queries
        .iter()
        .filter_map(|query| match query {
            ResolvedReportQuery::SQLQuery(sql) => Some(ReportSqlQuery {
                name: sql.name.clone(),
                sqlite: sql.query_sqlite.clone(),
                postgres: sql.query_postgres.clone(),
            }),
            ResolvedReportQuery::GraphQlQuery(_) => None,
        })
        .collect();

    if !sql_queries.is_empty() {
        // Hoisted out of the per-query loop: these variables were already identical for every SQL
        // query, and computing them once also gives every query the same `now` rather than one
        // `Utc::now()` per query.
        let variables = query_variables(store_id, &data_id, &arguments, &sort, &None);

        // The report's SQL queries are synchronous, so run them on the blocking pool rather than
        // the actix worker's runtime thread (#12710) - see the note on `generate_html_report`.
        // The executor runs them sequentially on one connection; see `ReportQueryExecutor::run`.
        let executor =
            ReportQueryExecutor::new(&ctx.get_settings().database, ctx.get_connection_manager());
        let results = tokio::task::spawn_blocking(move || executor.run(sql_queries, &variables))
            .await??;
        for (name, rows) in results {
            data.insert(name, serde_json::Value::Array(rows));
        }
    }

    Ok(FetchResult::Data(serde_json::Value::Object(data)))
}

async fn fetch_graphql_data(
    ctx: &Context<'_>,
    query: &GraphQlQuery,
    variables: serde_json::Map<String, serde_json::Value>,
) -> anyhow::Result<FetchResult> {
    let variables = serde_json::from_value(serde_json::Value::Object(variables))?;
    let user_data = ctx.data_unchecked::<RequestUserData>().clone();
    let self_requester = ctx.self_request().unwrap();
    let request = Request::new(query.query.clone()).variables(variables);
    let response = self_requester.call(request, user_data).await;
    if !response.errors.is_empty() {
        return Ok(FetchResult::Error(serde_json::to_value(&response.errors)?));
    }
    Ok(FetchResult::Data(response.data.into_json()?))
}

fn map_error(error: ReportError) -> Result<PrintReportErrorInterface> {
    let formatted_error = format!("{error:#?}");

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
        ReportError::MultipleGraphqlQueriesNotAllowed => {
            StandardGraphqlError::BadUserInput(formatted_error)
        }
        ReportError::TranslationError | ReportError::ConvertDataError(_) => {
            StandardGraphqlError::InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
