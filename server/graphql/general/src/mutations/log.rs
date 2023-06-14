use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::ContextExt;
use service::{
    auth::{Resource, ResourceAccessRequest},
    settings::Level,
};

use crate::queries::LogLevelEnum;

#[derive(InputObject)]
#[graphql(name = "UpsertLogLevelInput")]
pub struct LogLevelInput {
    pub level: LogLevelEnum,
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
        LogLevelEnum::Error => Level::Error,
        LogLevelEnum::Warn => Level::Warn,
        LogLevelEnum::Info => Level::Info,
        LogLevelEnum::Debug => Level::Debug,
        LogLevelEnum::Trace => Level::Trace,
        LogLevelEnum::Off => Level::Off,
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
