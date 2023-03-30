use crate::{
    service_provider::ServiceProvider,
    sync::{settings::SyncSettings, sync_api_credentials::SyncCredentials},
};
use repository::migrations::Version;
use reqwest::{
    header::{HeaderMap, HeaderName},
    Client, Response, Url,
};
use serde::{de::DeserializeOwned, Serialize};
use serde_json::json;
use thiserror::Error;
use url::ParseError;

use super::*;

#[derive(Debug, Clone)]
pub(crate) struct SyncApiV5 {
    pub(crate) server_url: Url,
    pub(crate) credentials: SyncCredentials,
    pub(crate) headers: HeaderMap,
}

fn generate_headers(hardware_id: &str, sync_version: u32) -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(
        HeaderName::from_static("msupply-site-uuid"),
        format!("{}", hardware_id).parse().unwrap(),
    );
    headers.insert(
        HeaderName::from_static("app-version"),
        Version::from_package_json().to_string().parse().unwrap(),
    );
    // TODO omSupply ? And maybe seperate header for app-os etc..
    headers.insert(
        HeaderName::from_static("app-name"),
        "remote_server".parse().unwrap(),
    );
    headers.insert(
        HeaderName::from_static("version"),
        sync_version.to_string().parse().unwrap(),
    );
    headers
}

#[derive(Error, Debug)]
pub enum SyncApiV5CreatingError {
    #[error("Cannot parse url while creating SyncApiV5 instance url: '{0}'")]
    CannotParseSyncUrl(String, #[source] ParseError),
    #[error("Error while creating SyncApiV5 instance")]
    Other(#[source] anyhow::Error),
}

impl SyncApiV5 {
    pub fn new(
        settings: &SyncSettings,
        service_provider: &ServiceProvider,
        sync_version: u32,
    ) -> Result<Self, SyncApiV5CreatingError> {
        use SyncApiV5CreatingError as Error;
        let hardware_id = service_provider
            .app_data_service
            .get_hardware_id()
            .map_err(|error| Error::Other(error.into()))?;

        Ok(SyncApiV5 {
            server_url: Url::parse(&settings.url)
                .map_err(|error| Error::CannotParseSyncUrl(settings.url.clone(), error))?,
            credentials: SyncCredentials {
                username: settings.username.clone(),
                password_sha256: settings.password_sha256.clone(),
            },
            headers: generate_headers(&hardware_id, sync_version),
        })
    }

    #[cfg(test)]
    pub(crate) fn new_test(url: &str, site_name: &str, password: &str, hardware_id: &str) -> Self {
        use crate::sync::settings::SYNC_VERSION;
        use util::hash::sha256;

        SyncApiV5 {
            server_url: Url::parse(&url).unwrap(),
            credentials: SyncCredentials {
                username: site_name.to_string(),
                password_sha256: sha256(&password),
            },
            headers: generate_headers(hardware_id, SYNC_VERSION),
        }
    }

    pub(crate) async fn do_get<T>(&self, route: &str, query: &T) -> Result<Response, SyncApiError>
    where
        T: Serialize + ?Sized,
    {
        let url = self
            .server_url
            .join(route)
            .map_err(|error| self.api_error(route, error.into()))?;
        let result = Client::new()
            .get(url.clone())
            .basic_auth(
                &self.credentials.username,
                Some(&self.credentials.password_sha256),
            )
            .headers(self.headers.clone())
            .query(query)
            .send()
            .await;

        response_or_err(result)
            .await
            .map_err(|error| self.api_error(route, error))
    }

    pub(crate) async fn do_get_no_query(&self, route: &str) -> Result<Response, SyncApiError> {
        self.do_get(route, &()).await
    }

    pub(crate) async fn do_post<T>(&self, route: &str, body: &T) -> Result<Response, SyncApiError>
    where
        T: Serialize,
    {
        let url = self
            .server_url
            .join(route)
            .map_err(|error| self.api_error(route, error.into()))?;
        let result = Client::new()
            .post(url.clone())
            .basic_auth(
                &self.credentials.username,
                Some(&self.credentials.password_sha256),
            )
            .headers(self.headers.clone())
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
) -> Result<Response, SyncApiErrorVariant> {
    let response = match result {
        Ok(result) => result,
        Err(error) => {
            if error.is_connect() {
                return Err(SyncApiErrorVariant::ConnectionError(error));
            } else {
                return Err(SyncApiErrorVariant::Other(error.into()));
            }
        }
    };

    if response.status().is_success() {
        return Ok(response);
    }

    Err(SyncApiErrorVariant::from_response_and_status(response.status(), response).await)
}

#[cfg(test)]
mod tests {
    use httpmock::{Method::POST, MockServer};
    use reqwest::header::AUTHORIZATION;
    use util::assert_matches;

    use super::*;

    #[actix_rt::test]
    async fn test_headers() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(POST)
                .header("msupply-site-uuid", "site_id")
                .header("app-version", Version::from_package_json().to_string())
                .header("app-name", "remote_server")
                .path("/sync/v5/acknowledged_records");
            then.status(204);
        });

        let api = SyncApiV5::new_test(&url, "", "", "site_id");

        let result = api.post_acknowledged_records(Vec::new()).await;

        mock.assert();

        assert_matches!(result, Ok(_));
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

        assert_matches!(result_with_auth, Ok(_));
        let sync_connection_with_auth = create_api(&url, "username", "invalid");
        let result_with_auth = sync_connection_with_auth
            .post_acknowledged_records(Vec::new())
            .await;

        assert_matches!(result_with_auth, Err(_));
    }
}
