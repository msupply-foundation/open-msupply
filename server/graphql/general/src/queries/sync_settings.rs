use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::settings::{BatchSize, SyncSettings},
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

    /// Configured sync batch size. Returns Some only when all three underlying
    /// values are equal and differ from the defaults, so the UI can pre-fill
    /// its single input. Non-uniform legacy values are reported as None.
    pub async fn batch_size(&self) -> Option<u32> {
        let BatchSize {
            remote_pull,
            remote_push,
            central_pull,
        } = &self.settings.batch_size;
        let defaults = BatchSize::default();
        let uniform = remote_pull == remote_push && remote_push == central_pull;
        let is_default = remote_pull == &defaults.remote_pull
            && remote_push == &defaults.remote_push
            && central_pull == &defaults.central_pull;
        if uniform && !is_default {
            Some(*remote_pull)
        } else {
            None
        }
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
