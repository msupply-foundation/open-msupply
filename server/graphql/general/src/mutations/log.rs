use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::ContextExt;
use service::{
    auth::{Resource, ResourceAccessRequest},
    settings::Level,
};

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

#[derive(InputObject)]
#[graphql(name = "UpsertLogLevelInput")]
pub struct LogLevelInput {
    pub level: LogLevel,
}

#[derive(SimpleObject)]
pub struct UpsertLogLevelResponse {
    pub success_message: String,
}

pub fn upsert_log_level(
    ctx: &Context<'_>,
    store_id: String,
    input: LogLevelInput,
) -> Result<UpsertLogLevelResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: Some(store_id),
        },
    )?;

    let level = match input.level {
        LogLevel::Error => Level::Error,
        LogLevel::Warn => Level::Warn,
        LogLevel::Info => Level::Info,
        LogLevel::Debug => Level::Debug,
        LogLevel::Trace => Level::Trace,
    };

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    service_provider
        .log_service
        .upsert_log_level(&service_context, level.clone())?;

    Ok(UpsertLogLevelResponse {
        success_message: format!("Log level set to {:?}", level),
    })
}
