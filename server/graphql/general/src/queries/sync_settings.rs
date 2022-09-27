use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::settings::SyncSettings,
};

#[derive(Debug)]
pub struct SyncSettingsNode {
    pub settings: Option<SyncSettings>,
}

#[derive(Union)]
pub enum SyncSettingsResponse {
    Response(SyncSettingsNode),
}

#[Object]
impl SyncSettingsNode {
    /// Central server url
    pub async fn url(&self) -> Option<String> {
        self.settings.as_ref().map(|s| s.url.clone())
    }

    /// Central server username
    pub async fn username(&self) -> Option<String> {
        self.settings.as_ref().map(|s| s.username.clone())
    }

    /// How frequently central data is synced
    pub async fn interval_seconds(&self) -> Option<u64> {
        self.settings.as_ref().map(|s| s.interval_seconds)
    }
}

pub(crate) fn sync_settings(ctx: &Context<'_>, with_auth: bool) -> Result<SyncSettingsResponse> {
    if with_auth {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::ServerAdmin,
                store_id: None,
            },
        )?;
    }

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let settings = SyncSettingsNode {
        settings: service_provider.settings.sync_settings(&service_context)?,
    };
    Ok(SyncSettingsResponse::Response(settings))
}
