use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    settings_service::UpdateSettingsError,
    site_info::set_api_info,
    sync::settings::SyncSettings,
};
use util::hash::sha256;

use crate::queries::server_settings::ServerSettingsNode;

#[derive(Union)]
pub enum UpdateServerSettingsResponse {
    Response(ServerSettingsNode),
}

#[derive(InputObject)]
#[graphql(name = "UpdateSyncSettingsInput")]
pub struct UpdateSyncSettingsInput {
    pub url: String,
    pub username: String,
    /// Plain text password
    pub password: String,
    /// Sync interval in sec
    pub interval_sec: u64,
}

#[derive(InputObject)]
#[graphql(name = "UpdateServerSettingsInput")]
pub struct UpdateServerSettingsInput {
    pub sync_settings: Option<UpdateSyncSettingsInput>,
}

pub async fn update_server_settings(
    ctx: &Context<'_>,
    input: UpdateServerSettingsInput,
    stage0: bool,
) -> Result<UpdateServerSettingsResponse> {
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
    let service_context = service_provider.context()?;
    let service = &service_provider.settings;
    let site_info_service = &service_provider.site_info;

    match input.sync_settings {
        Some(sync_settings) => {
            match service.update_sync_settings(&service_context, &sync_settings.to_domain()) {
                Ok(sync_settings) => sync_settings,
                Err(error) => {
                    let formatted_error = format!("{:#?}", error);
                    let graphql_error = match error {
                        UpdateSettingsError::RepositoryError(_) => {
                            StandardGraphqlError::InternalError(formatted_error)
                        }
                        UpdateSettingsError::InvalidSettings(_) => {
                            StandardGraphqlError::BadUserInput(formatted_error)
                        }
                    };
                    return Err(graphql_error.extend());
                }
            };
        }
        None => {}
    };

    // get current settings
    let sync_settings = match service.sync_settings(&service_context) {
        Ok(sync_settings) => sync_settings,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let graphql_error = StandardGraphqlError::InternalError(formatted_error);
            return Err(graphql_error.extend());
        }
    };

    let remote = set_api_info(&sync_settings.clone().unwrap(), service_provider)?;
    let site_info = match site_info_service.request_site_info(remote).await {
        Ok(site_info) => site_info,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let graphql_error = StandardGraphqlError::InternalError(formatted_error);
            return Err(graphql_error.extend());
        }
    };
    site_info_service.set_site_info(&service_context.connection, site_info)?;

    Ok(UpdateServerSettingsResponse::Response(
        ServerSettingsNode::from_domain(sync_settings, stage0),
    ))
}

impl UpdateSyncSettingsInput {
    fn to_domain(self) -> SyncSettings {
        SyncSettings {
            url: self.url,
            username: self.username,
            password_sha256: sha256(&self.password),
            interval_sec: self.interval_sec,
        }
    }
}
