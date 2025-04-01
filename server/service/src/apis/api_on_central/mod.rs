use repository::{NameStoreJoinRepository, NameStoreJoinRow, RepositoryError};
use reqwest::{ClientBuilder, StatusCode};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use url::Url;
use util::format_error;

use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    sync::CentralServerConfig,
};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NameStoreJoinParams {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
}

#[derive(Debug)]
pub struct SiteAuth {
    pub username: String,
    pub password_sha256: String,
}

#[derive(Deserialize, Debug, Error, Serialize)]
pub enum CentralApiError {
    #[error("Not a central server")]
    NotACentralServer,
    #[error("Not authorized")]
    NotAuthorized,
    #[error("Connection error: {0}")]
    ConnectionError(String),
    #[error("Internal error: {0}")]
    InternalError(String),
}

impl From<RepositoryError> for CentralApiError {
    fn from(from: RepositoryError) -> Self {
        CentralApiError::InternalError(format_error(&from))
    }
}

/// Creates/updates a name_store_join for a patient
pub async fn patient_name_store_join(
    service_provider: &ServiceProvider,
    NameStoreJoinParams {
        id,
        name_id,
        store_id,
    }: NameStoreJoinParams,
    auth: SiteAuth,
) -> Result<(), CentralApiError> {
    if !CentralServerConfig::is_central_server() {
        return Err(CentralApiError::NotACentralServer);
    }

    let ctx = service_provider.basic_context()?;
    validate_auth(service_provider, &ctx, &auth).await?;

    let name_store_join_repo = NameStoreJoinRepository::new(&ctx.connection);

    // TODO: maybe should prevent this from creating a changelog? Let the OG one be source of truth?
    name_store_join_repo.upsert_one(&NameStoreJoinRow {
        id,
        store_id,
        // I think ideally would do a lookup and see if we have a name_link_id,
        // but should do the same as in sync translation
        name_link_id: name_id,

        // This is only used for adding patient visibility, so ok to set these here
        name_is_customer: true,
        name_is_supplier: false,
    })?;

    Ok(())
}

// OMS Central does not yet do auth validation for site credentials
// So we call an OG endpoint to validate the credentials
// (/login endpoint is for user credentials, using name_store_join for site credentials)
async fn validate_auth(
    service_provider: &ServiceProvider,
    ctx: &ServiceContext,
    auth: &SiteAuth,
) -> Result<(), CentralApiError> {
    let sync_settings =
        service_provider
            .settings
            .sync_settings(ctx)?
            .ok_or(CentralApiError::InternalError(
                "Missing sync settings".to_string(),
            ))?;

    let central_server_url = Url::parse(&sync_settings.url).map_err(|err| {
        CentralApiError::InternalError(format!("Failed to parse central server url: {}", err))
    })?;
    let client = ClientBuilder::new()
        .build()
        .map_err(|err| CentralApiError::ConnectionError(format!("{:?}", err)))?;

    let response = client
        .post(central_server_url.join("/api/v4/name_store_join").unwrap())
        .basic_auth(&auth.username, Some(&auth.password_sha256))
        // Send an empty body - we don't want to actually create a name_store_join, just validate auth
        .json("")
        .send()
        .await
        .map_err(|err| CentralApiError::ConnectionError(format!("{:?}", err)))?;

    if response.status() == StatusCode::UNAUTHORIZED {
        return Err(CentralApiError::NotAuthorized);
    }

    Ok(())
}
