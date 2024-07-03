use std::time::Duration;

use reqwest::ClientBuilder;

use crate::{
    apis::login_v4::{LoginApiV4, LoginInputV4, LoginV4Error},
    service_provider::ServiceProvider,
};

use super::*;

const CONNECTION_TIMEOUT_SEC: u64 = 10;

#[derive(Debug, Clone)]
pub struct LoginV7Api {}

impl LoginV7Api {
    pub async fn login(
        service_provider: &ServiceProvider,
        input: LoginInputV4,
    ) -> Result<LoginResponseV4, LoginV7Error> {
        let service_context = service_provider.basic_context()?;

        let sync_settings = service_provider
            .settings
            .sync_settings(&service_context)?
            .ok_or(LoginV7Error::OtherServerError(
                "Sync settings not available".to_string(),
            ))?;

        let central_server_url = Url::parse(&sync_settings.url).map_err(|err| {
            LoginV7Error::OtherServerError(format!("Failed to parse central server url: {}", err))
        })?;

        let client = ClientBuilder::new()
            .connect_timeout(Duration::from_secs(CONNECTION_TIMEOUT_SEC))
            .build()
            .map_err(|err| LoginV7Error::ConnectionError(format!("{:?}", err)))?;

        let result = match LoginApiV4::new(client, central_server_url)
            .login(input)
            .await
        {
            Ok(response) => response,
            Err(LoginV4Error::ConnectionError(err)) => {
                return Err(LoginV7Error::ConnectionError(format!("{:?}", err)))
            }
            Err(LoginV4Error::Unauthorised) => return Err(LoginV7Error::Unauthorised),
            Err(LoginV4Error::AccountBlocked(timeout_remaining)) => {
                return Err(LoginV7Error::AccountBlocked(timeout_remaining))
            }
            Err(LoginV4Error::ParseError(err)) => {
                return Err(LoginV7Error::OtherServerError(format!("{:?}", err)))
            }
        };

        Ok(result)
    }
}
