use std::{collections::HashMap, convert::TryInto};

use crate::{service_provider::ServiceProvider, sync::settings::SyncSettings};
use repository::migrations::Version;
use reqwest::{header::HeaderMap, Client, Response, Url};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::json;
use thiserror::Error;
use url::ParseError;

use super::*;

#[cfg(target_os = "android")]
const APP_NAME: &str = "Open mSupply Android";

#[cfg(not(target_os = "android"))]
const APP_NAME: &str = "Open mSupply Desktop";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncApiSettings {
    pub server_url: String,
    pub username: String,
    pub password_sha256: String,
    pub site_uuid: String,
    pub app_version: String,
    pub app_name: String,
    pub sync_version: String,
}

#[derive(Debug, Clone)]
pub struct SyncApiV5 {
    pub url: Url,
    pub settings: SyncApiSettings,
}

fn tuple_vec_to_header(tuple_vec: Vec<(&str, &str)>) -> HeaderMap {
    let map = tuple_vec
        .into_iter()
        .map(|(s1, s2)| (s1.to_string(), s2.to_string()))
        .collect::<HashMap<String, String>>();
    // Can unwrap here, will be caught in unit tests
    (&map).try_into().unwrap()
}

#[derive(Error, Debug)]
pub enum SyncApiV5CreatingError {
    #[error("Cannot parse url while creating SyncApiV5 instance url: '{0}'")]
    CannotParseSyncUrl(String, #[source] ParseError),
    #[error("Error while creating SyncApiV5 instance")]
    Other(#[source] anyhow::Error),
}

impl SyncApiV5 {
    pub fn new_settings(
        settings: &SyncSettings,
        service_provider: &ServiceProvider,
        sync_version: u32,
    ) -> Result<SyncApiSettings, SyncApiV5CreatingError> {
        use SyncApiV5CreatingError as Error;

        let SyncSettings {
            username,
            password_sha256,
            url,
            ..
        } = settings.clone();

        Ok(SyncApiSettings {
            server_url: url,
            site_uuid: service_provider
                .app_data_service
                .get_hardware_id()
                .map_err(|error| Error::Other(error.into()))?,
            app_version: Version::from_package_json().to_string(),
            app_name: APP_NAME.to_string(),
            sync_version: sync_version.to_string(),
            username,
            password_sha256,
        })
    }

    pub fn new(settings: SyncApiSettings) -> Result<Self, SyncApiV5CreatingError> {
        Ok(Self {
            url: Url::parse(&settings.server_url).map_err(|error| {
                SyncApiV5CreatingError::CannotParseSyncUrl(settings.server_url.clone(), error)
            })?,
            settings,
        })
    }

    #[cfg(test)]
    pub(crate) fn new_test(url: &str, site_name: &str, password: &str, hardware_id: &str) -> Self {
        use crate::sync::settings::SYNC_V5_VERSION;
        use util::hash::sha256;

        SyncApiV5 {
            url: Url::parse(url).unwrap(),
            settings: SyncApiSettings {
                server_url: url.to_string(),
                username: site_name.to_string(),
                password_sha256: sha256(password),
                site_uuid: hardware_id.to_string(),
                sync_version: SYNC_V5_VERSION.to_string(),
                app_version: Version::from_package_json().to_string(),
                app_name: APP_NAME.to_string(),
            },
        }
    }

    pub(crate) async fn do_get<T>(&self, route: &str, query: &T) -> Result<Response, SyncApiError>
    where
        T: Serialize + ?Sized,
    {
        let SyncApiSettings {
            server_url: _,
            username,
            password_sha256,
            site_uuid,
            app_version,
            app_name,
            sync_version,
        } = &self.settings;

        let url = self
            .url
            .join(route)
            .map_err(|error| self.api_error(route, error.into()))?;

        let result = Client::new()
            .get(url.clone())
            .headers(tuple_vec_to_header(vec![
                ("msupply-site-uuid", site_uuid),
                ("app-version", app_version),
                ("app-name", app_name),
                ("version", sync_version),
            ]))
            .basic_auth(username, Some(password_sha256))
            .query(query)
            .send()
            .await;

        response_or_err(result)
            .await
            .map_err(|error| self.api_error(route, error))
    }

    pub(crate) async fn do_post<T>(&self, route: &str, body: &T) -> Result<Response, SyncApiError>
    where
        T: Serialize,
    {
        let SyncApiSettings {
            server_url: _,
            username,
            password_sha256,
            site_uuid,
            app_version,
            app_name,
            sync_version,
        } = &self.settings;

        let url = self
            .url
            .join(route)
            .map_err(|error| self.api_error(route, error.into()))?;

        let result = Client::new()
            .post(url.clone())
            .headers(tuple_vec_to_header(vec![
                ("msupply-site-uuid", site_uuid),
                ("app-version", app_version),
                ("app-name", app_name),
                ("version", sync_version),
            ]))
            .basic_auth(username, Some(password_sha256))
            // Re unwrap, from to_string documentation:
            // Serialization can fail if T's implementation of Serialize decides to fail, or if T contains a map with non-string keys.
            .body(serde_json::to_string(&body).unwrap())
            .send()
            .await;

        response_or_err(result)
            .await
            .map_err(|error| self.api_error(route, error))
    }

    pub(crate) async fn do_empty_post(&self, route: &str) -> Result<Response, SyncApiError> {
        self.do_post(route, &json!({})).await
    }
}

#[derive(Error, Debug)]
pub enum ParsingResponseError {
    #[error("Cannot retrieve response body")]
    CannotGetTextResponse(#[from] reqwest::Error),
    #[error("Could not parse response body, response: '{response_text}'")]
    ParseError {
        source: serde_json::Error,
        response_text: String,
    },
}

pub(crate) async fn to_json<T: DeserializeOwned>(
    response: Response,
) -> Result<T, ParsingResponseError> {
    // TODO not owned (to avoid double parsing)
    let response_text = response.text().await?;
    let result = serde_json::from_str(&response_text).map_err(|source| {
        ParsingResponseError::ParseError {
            source,
            response_text,
        }
    })?;
    Ok(result)
}

async fn response_or_err(
    result: Result<Response, reqwest::Error>,
) -> Result<Response, SyncApiErrorVariantV5> {
    let response = match result {
        Ok(result) => result,
        Err(error) => {
            if error.is_connect() {
                return Err(SyncApiErrorVariantV5::ConnectionError(error));
            } else {
                return Err(SyncApiErrorVariantV5::Other(error.into()));
            }
        }
    };

    if response.status().is_success() {
        return Ok(response);
    }

    Err(SyncApiErrorVariantV5::from_response_and_status(response.status(), response).await)
}

#[cfg(test)]
mod tests {
    use httpmock::{Method::POST, MockServer};
    use reqwest::header::AUTHORIZATION;

    use super::*;

    #[actix_rt::test]
    async fn test_headers() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(POST)
                .header("msupply-site-uuid", "site_id")
                .header("app-version", Version::from_package_json().to_string())
                .header("app-name", "Open mSupply Desktop")
                .path("/sync/v5/acknowledged_records");
            then.status(204);
        });

        let api = SyncApiV5::new_test(&url, "", "", "site_id");

        let result = api.post_acknowledged_records(Vec::new()).await;

        mock.assert();

        assert!(result.is_ok());
    }

    #[actix_rt::test]
    async fn test_authorisation() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock_authorisation_header =
	    "Basic dXNlcm5hbWU6NWU4ODQ4OThkYTI4MDQ3MTUxZDBlNTZmOGRjNjI5Mjc3MzYwM2QwZDZhYWJiZGQ2MmExMWVmNzIxZDE1NDJkOA=="
	    .to_owned();

        let mock = mock_server.mock(|when, then| {
            when.method(POST)
                .header(AUTHORIZATION.to_string(), mock_authorisation_header)
                .path("/sync/v5/acknowledged_records");
            then.status(204);
        });

        let sync_connection_with_auth = create_api(&url, "username", "password");
        let result_with_auth = sync_connection_with_auth
            .post_acknowledged_records(Vec::new())
            .await;

        mock.assert();
        assert!(result_with_auth.is_ok());

        let sync_connection_with_auth = create_api(&url, "username", "invalid");
        let result_with_auth = sync_connection_with_auth
            .post_acknowledged_records(Vec::new())
            .await;

        assert!(result_with_auth.is_err());
    }
}
