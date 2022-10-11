use async_graphql::*;

use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::RepositoryError;
use service::{
    auth::{Resource, ResourceAccessRequest},
    display_settings_service,
};
use std::fmt;

use crate::queries::display_settings::DisplaySettingsNode;

#[derive(InputObject)]
pub struct DisplaySettingsInput {
    pub custom_logo: Option<String>,
    pub custom_theme: Option<String>,
}

pub enum UpdateDisplaySettingsError {
    RepositoryError(RepositoryError),
    AuthError(String),
    GraphqlError(String),
}

impl fmt::Display for UpdateDisplaySettingsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            UpdateDisplaySettingsError::RepositoryError(error) => {
                write!(f, "Repository error: {}", error)
            }
            UpdateDisplaySettingsError::AuthError(error) => write!(f, "Auth error: {}", error),
            UpdateDisplaySettingsError::GraphqlError(error) => {
                write!(f, "Graphql error: {}", error)
            }
        }
    }
}

impl From<RepositoryError> for UpdateDisplaySettingsError {
    fn from(error: RepositoryError) -> Self {
        UpdateDisplaySettingsError::RepositoryError(error)
    }
}

impl From<async_graphql::Error> for UpdateDisplaySettingsError {
    fn from(error: async_graphql::Error) -> Self {
        UpdateDisplaySettingsError::GraphqlError(error.message.clone())
    }
}

impl DisplaySettingsInput {
    pub fn to_domain(&self) -> display_settings_service::DisplaySettingsInput {
        display_settings_service::DisplaySettingsInput {
            custom_logo: self.custom_logo.clone(),
            custom_theme: self.custom_theme.clone(),
        }
    }
}

pub fn update_display_settings(
    ctx: &Context<'_>,
    input: DisplaySettingsInput,
) -> Result<DisplaySettingsNode, UpdateDisplaySettingsError> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let display_settings = input.to_domain();

    if let Err(error) = service_provider
        .display_settings_service
        .update_display_settings(&service_context, &display_settings)
    {
        return Err(UpdateDisplaySettingsError::RepositoryError(error));
    }

    let display_settings = service_provider
        .display_settings_service
        .display_settings(&service_context)?;

    Ok(DisplaySettingsNode {
        settings: display_settings.unwrap(),
    })
}
