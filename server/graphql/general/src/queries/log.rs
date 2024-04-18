use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use service::{
    auth::{Resource, ResourceAccessRequest},
    settings::Level,
};

#[derive(SimpleObject)]
pub struct LogNode {
    pub file_names: Option<Vec<String>>,
    pub file_content: Option<Vec<String>>,
}

impl LogNode {
    fn from_domain(file_names: Option<Vec<String>>, file_content: Option<Vec<String>>) -> LogNode {
        LogNode {
            file_names,
            file_content,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
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
            resource: Resource::QueryLog,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let log_service = &service_provider.log_service;
    let file_names = log_service.get_log_file_names(&service_context)?;

    Ok(LogNode::from_domain(Some(file_names), None))
}

pub fn log_content(ctx: &Context<'_>, file_name: Option<String>) -> Result<LogNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryLog,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let log_service = &service_provider.log_service;
    let content = log_service.get_log_content(&service_context, file_name)?;

    Ok(LogNode::from_domain(Some(vec![content.0]), Some(content.1)))
}

pub fn log_level(ctx: &Context<'_>) -> Result<LogLevelNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryLog,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let log_service = &service_provider.log_service;
    let level = log_service.get_log_level(&service_context)?;

    Ok(LogLevelNode {
        level: match level {
            Some(level) => match level {
                Level::Error => LogLevelEnum::Error,
                Level::Warn => LogLevelEnum::Warn,
                Level::Info => LogLevelEnum::Info,
                Level::Debug => LogLevelEnum::Debug,
                Level::Trace => LogLevelEnum::Trace,
            },
            None => LogLevelEnum::Info,
        },
    })
}
