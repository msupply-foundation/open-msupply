use async_graphql::*;
use graphql_core::{ContextExt, standard_graphql_error::validate_auth};
use service::auth::{Resource, ResourceAccessRequest};

#[derive(SimpleObject)]
pub struct LogNode {
    pub file_names: Option<Vec<String>>,
    /// The file's text, as written: at most its last 1 MiB. Download the whole file from
    /// `/support/log/{name}`.
    pub content: Option<String>,
    /// Whether `content` is only the end of a longer file.
    pub truncated: Option<bool>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
#[graphql(remote = "service::settings::Level")]
pub enum LogLevelEnum {
    Error,
    Warn,
    Info,
    Debug,
    Trace,
}

#[derive(SimpleObject)]
pub struct LogLevelNode {
    pub level: LogLevelEnum,
}

pub fn log_file_names(ctx: &Context<'_>) -> Result<LogNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let log_service = &service_provider.log_service;
    let file_names = log_service.get_log_file_names(&service_context)?;

    Ok(LogNode {
        file_names: Some(file_names),
        content: None,
        truncated: None,
    })
}

pub fn log_content(ctx: &Context<'_>, file_name: Option<String>) -> Result<LogNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let log_service = &service_provider.log_service;
    let tail = log_service.get_log_tail(&service_context, file_name)?;

    Ok(LogNode {
        file_names: Some(vec![tail.file_name]),
        content: Some(tail.content),
        truncated: Some(tail.truncated),
    })
}

pub fn log_level(ctx: &Context<'_>) -> Result<LogLevelNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let log_service = &service_provider.log_service;
    let level = log_service.get_log_level(&service_context)?;

    Ok(LogLevelNode {
        level: level.map(LogLevelEnum::from).unwrap_or(LogLevelEnum::Info),
    })
}
