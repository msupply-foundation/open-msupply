use async_graphql::{
    extensions::{
        Extension, ExtensionContext, ExtensionFactory, NextExecute, NextParseQuery, NextValidation,
    },
    parser::types::{ExecutableDocument, Selection},
    Response, ServerError, ServerResult, ValidationResult, Variables,
};
use chrono::{DateTime, Utc};
use rand::Rng;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct GraphQLRequestLogger;

impl ExtensionFactory for GraphQLRequestLogger {
    fn create(&self) -> Arc<dyn Extension> {
        Arc::new(LoggerExtension {})
    }
}

struct LoggerExtension {}

#[derive(Debug, Default)]
pub struct QueryLogInfo {
    inner: Arc<Mutex<QueryInfoInner>>,
}
impl QueryLogInfo {
    pub fn new() -> QueryLogInfo {
        let mut rng = rand::thread_rng();
        QueryLogInfo {
            inner: Arc::new(Mutex::new(QueryInfoInner {
                id: rng.gen_range(100_000_000..=999_999_999),
                start_time: Utc::now(),
            })),
        }
    }
}

#[derive(Debug, Default)]
pub struct QueryInfoInner {
    id: u64,
    start_time: DateTime<Utc>,
}

#[async_trait::async_trait]
impl Extension for LoggerExtension {
    // Log any invalid queries received
    async fn validation(
        &self,
        ctx: &ExtensionContext<'_>,
        next: NextValidation<'_>,
    ) -> Result<ValidationResult, Vec<ServerError>> {
        let res = next.run(ctx).await;

        match res {
            Ok(_) => res,
            Err(ref errors) => match ctx.data_opt::<QueryLogInfo>() {
                Some(info) => {
                    let info = info.inner.lock().await;
                    for e in errors {
                        log::info!(
                            target: "gql_logger",
                            "[QueryID: {}] Received invalid query: {}",
                            info.id,
                            e.message
                        )
                    }
                    res
                }
                None => res,
            },
        }
    }

    // Log the received request
    async fn parse_query(
        &self,
        ctx: &ExtensionContext<'_>,
        query: &str,
        variables: &Variables,
        next: NextParseQuery<'_>,
    ) -> ServerResult<ExecutableDocument> {
        let document = next.run(ctx, query, variables).await?;
        if let Some(info) = ctx.data_opt::<QueryLogInfo>() {
            let info = info.inner.lock().await;

            let mut variables = variables.clone();
            if let Some(password) = variables.get_mut("password") {
                *password = "****".into(); // Mask password variable if present
            }

            for (_, operation) in document.operations.iter() {
                let roots_queried = operation
                    .node
                    .selection_set
                    .node
                    .items
                    .iter()
                    .filter_map(|i| {
                        if let Selection::Field(field) = &i.node {
                            Some(field.node.name.node.as_str())
                        } else {
                            None
                        }
                    })
                    .collect::<Vec<_>>();

                log::info!(
                    target: "gql_logger",
                    "[QueryID: {}] {}: {} {}",
                    info.id,
                    operation.node.ty,        // mutation or query
                    roots_queried.join(", "), // e.g. `updateStockLine`, or `locations`
                    if variables.is_empty() {
                       "".to_string()
                    } else {
                        format!(" - variables: {:?}", serde_json::to_value(&variables).unwrap_or_else(|_| serde_json::Value::Null))
                    }
                );
            }

            log::trace!(target: "gql_logger", "[QueryID: {}] Full request: {}", info.id, ctx.stringify_execute_doc(&document, &variables));
        }
        Ok(document)
    }

    // Log the response
    async fn execute(
        &self,
        ctx: &ExtensionContext<'_>,
        operation_name: Option<&str>,
        next: NextExecute<'_>,
    ) -> Response {
        let resp = next.run(ctx, operation_name).await;
        if let Some(info) = ctx.data_opt::<QueryLogInfo>() {
            let info = info.inner.lock().await;
            let query_id = info.id;

            // TODO: Log our structured errors too!

            // Log errors to the info level
            if resp.is_err() {
                for err in &resp.errors {
                    log::info!(
                        target: "gql_logger",
                        "[QueryID: {query_id}] [Error] {}", err.message,
                    );
                }
            }
            let query_start_time = info.start_time;
            let duration = Utc::now() - query_start_time;

            // Log successful responses to the debug level
            log::debug!(target: "gql_logger",
                        "[QueryID: {query_id}] Response: {} Duration: {}ms",
                        resp.data,
                        duration.num_milliseconds()
            );
        }

        resp
    }
}
