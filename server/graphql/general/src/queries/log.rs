use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};

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

pub async fn log_file_names(ctx: &Context<'_>) -> Result<LogNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider_data();

    let file_names = tokio::task::spawn_blocking(move || -> Result<_> {
        let service_context = service_provider
            .basic_context()
            .map_err(StandardGraphqlError::from_repository_error)?;
        let log_service = &service_provider.log_service;
        Ok(log_service.get_log_file_names(&service_context)?)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(LogNode::from_domain(Some(file_names), None))
}

pub async fn log_content(ctx: &Context<'_>, file_name: Option<String>) -> Result<LogNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider_data();

    let content = tokio::task::spawn_blocking(move || -> Result<_> {
        let service_context = service_provider
            .basic_context()
            .map_err(StandardGraphqlError::from_repository_error)?;
        let log_service = &service_provider.log_service;
        Ok(log_service.get_log_content(&service_context, file_name)?)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(LogNode::from_domain(Some(vec![content.0]), Some(content.1)))
}

pub async fn log_level(ctx: &Context<'_>) -> Result<LogLevelNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider_data();

    let level = tokio::task::spawn_blocking(move || -> Result<_> {
        let service_context = service_provider
            .basic_context()
            .map_err(StandardGraphqlError::from_repository_error)?;
        let log_service = &service_provider.log_service;
        Ok(log_service.get_log_level(&service_context)?)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(LogLevelNode {
        level: level.map(LogLevelEnum::from).unwrap_or(LogLevelEnum::Info),
    })
}
