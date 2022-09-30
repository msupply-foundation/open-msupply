use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::settings::SyncSettings,
};

#[derive(Debug)]
pub struct SyncSettingsNode {
    pub settings: SyncSettings,
}

#[Object]
impl SyncSettingsNode {
    /// Central server url
    pub async fn url(&self) -> &str {
        &self.settings.url
    }

    /// Central server username
    pub async fn username(&self) -> &str {
        &self.settings.username
    }

    /// How frequently central data is synced
    pub async fn interval_seconds(&self) -> u64 {
        self.settings.interval_seconds
    }
}

pub(crate) fn sync_settings(
    ctx: &Context<'_>,
    with_auth: bool,
) -> Result<Option<SyncSettingsNode>> {
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

    let settings = service_provider.settings.sync_settings(&service_context)?;
    Ok(settings.map(|settings| SyncSettingsNode { settings }))
}
