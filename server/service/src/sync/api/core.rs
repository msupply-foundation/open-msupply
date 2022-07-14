use crate::sync::SyncCredentials;
use anyhow::Context;
use reqwest::{
    header::{HeaderMap, HeaderName},
    Client, Response, Url,
};
use serde::{de::DeserializeOwned, Serialize};
use serde_json::json;
use thiserror::Error;

use super::*;

#[derive(Debug, Clone)]
pub(crate) struct SyncApiV5 {
    server_url: Url,
    credentials: SyncCredentials,
    client: Client,
    headers: HeaderMap,
}

fn generate_headers(hardware_id: &str) -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(
        HeaderName::from_static("msupply-site-uuid"),
        format!("{}", hardware_id).parse().unwrap(),
    );
    headers.insert(
        HeaderName::from_static("app-version"),
        "1.0".parse().unwrap(),
    );
    headers.insert(
        HeaderName::from_static("app-name"),
        "remote_server".parse().unwrap(),
    );
    headers
}

impl SyncApiV5 {
    pub(crate) fn new(
        server_url: Url,
        credentials: SyncCredentials,
        client: Client,
        hardware_id: &str,
    ) -> SyncApiV5 {
        SyncApiV5 {
            server_url,
            credentials,
            client,
            headers: generate_headers(&hardware_id),
        }
    }

    pub(crate) async fn do_get<T>(&self, route: &str, query: &T) -> Result<Response, SyncApiError>
    where
        T: Serialize + ?Sized,
    {
        let url = self.server_url.join(route).context("Failed to parse url")?;
        let result = self
            .client
            .get(url.clone())
            .basic_auth(
                &self.credentials.username,
                Some(&self.credentials.password_sha256),
            )
            .headers(self.headers.clone())
            .query(query)
            .send()
            .await;

        response_or_err(url, result).await
    }

    pub(crate) async fn do_get_no_query(&self, route: &str) -> Result<Response, SyncApiError> {
        self.do_get(route, &()).await
    }

    pub(crate) async fn do_post<T>(&self, route: &str, body: &T) -> Result<Response, SyncApiError>
    where
        T: Serialize,
    {
        let url = self.server_url.join(route).context("Failed to parse url")?;
        let result = self
            .client
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

        response_or_err(url, result).await
    }

    pub(crate) async fn do_empty_post(&self, route: &str) -> Result<Response, SyncApiError> {
        self.do_post(route, &json!({})).await
    }
}

#[derive(Error, Debug)]
pub(crate) enum ParsingResponseError {
    #[error("Cannot retreive response body: {0}")]
    CannotGetTextReponse(reqwest::Error),
    #[error("Could not parse response body, error: ({source}) reponse; ({response_text}) ")]
    ParseError {
        source: serde_json::Error,
        response_text: String,
    },
}

pub(crate) async fn to_json<T: DeserializeOwned>(
    response: Response,
) -> Result<T, ParsingResponseError> {
    // TODO not owned (to avoid double parsing)
    let response_text = response
        .text()
        .await
        .map_err(ParsingResponseError::CannotGetTextReponse)?;
    let result = serde_json::from_str(&response_text).map_err(|source| {
        ParsingResponseError::ParseError {
            source,
            response_text,
        }
    })?;
    Ok(result)
}

async fn response_or_err(
    url: Url,
    result: Result<Response, reqwest::Error>,
) -> Result<Response, SyncApiError> {
    let response = match result {
        Ok(result) => result,
        Err(error) => {
            if error.is_connect() {
                return Err(SyncApiError::ConnectionError { source: error, url });
            } else {
                return Err(SyncApiError::Other(error.into()));
            }
        }
    };

    if response.status().is_success() {
        return Ok(response);
    }

    Err(SyncErrorV5::from_response_and_status(response.status(), response).await)
}

#[cfg(test)]
mod tests {
    use httpmock::{Method::POST, MockServer};
    use reqwest::{header::AUTHORIZATION, Client, Url};
    use util::assert_matches;

    use super::*;

    #[actix_rt::test]
    async fn test_headers() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(POST)
                .header("msupply-site-uuid", "site_id")
                .header("app-version", "1.0")
                .header("app-name", "remote_server")
                .path("/sync/v5/acknowledged_records");
            then.status(204);
        });

        let api = SyncApiV5::new(
            Url::parse(&url).unwrap(),
            SyncCredentials::from_plain("", ""),
            Client::new(),
            "site_id",
        );

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
