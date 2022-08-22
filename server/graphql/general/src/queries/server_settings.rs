use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use serde::Serialize;
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::settings::SyncSettings,
};

// TODO find a better place, e.g. merge with getApiVersion?
#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum ServerStatus {
    /// Server misses configuration to start up fully
    Stage0,
    Running,
}

#[derive(Debug)]
pub struct SyncSettingsNode {
    pub settings: SyncSettings,
}

#[Object]
impl SyncSettingsNode {
    /// Central server url
    pub async fn url(&self) -> String {
        self.settings.url.clone()
    }

    /// Central server username
    pub async fn username(&self) -> String {
        self.settings.username.clone()
    }

    /// How frequently central data is synced
    pub async fn interval_sec(&self) -> u64 {
        self.settings.interval_sec
    }

    pub async fn central_server_site_id(&self) -> u32 {
        self.settings.central_server_site_id
    }

    pub async fn site_id(&self) -> u32 {
        self.settings.site_id
    }
}

#[derive(Debug)]
pub struct ServerSettingsNode {
    pub status: ServerStatus,
    pub sync_settings: Option<SyncSettings>,
}

#[Object]
impl ServerSettingsNode {
    async fn status(&self) -> ServerStatus {
        self.status
    }

    /// Currently used sync settings (may differ from what is stored in the DB)
    async fn sync_settings(&self, ctx: &Context<'_>) -> Option<SyncSettingsNode> {
        ctx.get_settings()
            .sync
            .as_ref()
            .map(|settings| SyncSettingsNode {
                settings: settings.clone(),
            })
    }

    /// Returns sync settings as currently stored on the server. If null no sync settings are set.
    async fn sync_settings_db(&self) -> Option<SyncSettingsNode> {
        self.sync_settings
            .as_ref()
            .map(|sync_settings| SyncSettingsNode {
                settings: sync_settings.clone(),
            })
    }
}

#[derive(Union)]
pub enum ServerSettingsResponse {
    Response(ServerSettingsNode),
}

#[derive(Debug)]
pub struct RestartNode {}

pub fn get_server_settings(ctx: &Context<'_>, stage0: bool) -> Result<ServerSettingsResponse> {
    if !stage0 {
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
    let service = &service_provider.settings;

    let sync_settings = match service.sync_settings(&service_context) {
        Ok(sync_settings) => sync_settings,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let graphql_error = StandardGraphqlError::InternalError(formatted_error);
            return Err(graphql_error.extend());
        }
    };

    Ok(ServerSettingsResponse::Response(
        ServerSettingsNode::from_domain(sync_settings, stage0),
    ))
}

impl ServerSettingsNode {
    pub fn from_domain(sync_settings: Option<SyncSettings>, stage0: bool) -> Self {
        ServerSettingsNode {
            status: match stage0 {
                true => ServerStatus::Stage0,
                false => ServerStatus::Running,
            },
            sync_settings,
        }
    }
}

#[Object]
impl RestartNode {
    async fn message(&self) -> &'static str {
        "Restarting"
    }
}

pub async fn server_restart(ctx: &Context<'_>, stage0: bool) -> Result<RestartNode> {
    if !stage0 {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::ServerAdmin,
                store_id: None,
            },
        )?;
    }

    match ctx.restart_switch().send(true).await {
        Ok(_) => Ok(RestartNode {}),
        Err(err) => {
            let formatted_error = format!("{:#?}", err);
            let graphql_error = StandardGraphqlError::InternalError(formatted_error);
            Err(graphql_error.extend())
        }
    }
}
