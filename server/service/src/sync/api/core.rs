use std::{collections::HashMap, convert::TryInto};

use crate::{
    apis::api_on_central::CentralApiError,
    service_provider::{ServiceContext, ServiceProvider},
    sync::settings::SyncSettings,
};
use repository::{migrations::Version, KeyType, KeyValueStoreRepository};
use reqwest::{header::HeaderMap, Response, Url};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::json;
use thiserror::Error;
use url::ParseError;
use util::{format_error, with_retries_opts, RetrySeconds};

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

        // Don't retry idle-timeouts: legacy sync v5 requests can run for minutes server-side
        // and continue after the client gives up; retrying would overlap the same site's
        // in-flight request and trip `sync_is_running`. Connect errors are still retried.
        let result = with_retries_opts(RetrySeconds::default(), false, |client| {
            client
                .get(url.clone())
                .headers(tuple_vec_to_header(vec![
                    ("msupply-site-uuid", site_uuid),
                    ("app-version", app_version),
                    ("app-name", app_name),
                    ("version", sync_version),
                ]))
                .basic_auth(username, Some(password_sha256))
                .query(query)
        })
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

        // See `do_get`: don't retry idle-timeouts for sync v5 (avoids same-site self-overlap).
        let result = with_retries_opts(RetrySeconds::default(), false, |client| {
            client
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
        })
        .await;

        response_or_err(result)
            .await
            .map_err(|error| self.api_error(route, error))
    }

    pub(crate) async fn do_empty_post(&self, route: &str) -> Result<Response, SyncApiError> {
        self.do_post(route, &json!({})).await
    }

    /// Poll `/sync/v5/site_status` until central reports `Idle`. Used to wait out a
    /// "central busy" response (another sync session for this site is in progress;
    /// legacy central gates sync per-site) before retrying. Errors on timeout.
    pub(crate) async fn wait_until_central_idle(
        &self,
        poll_period_seconds: u64,
        timeout_seconds: u64,
    ) -> Result<(), SyncApiError> {
        let route = "/sync/v5/site_status";
        let start = std::time::SystemTime::now();
        let poll_period = std::time::Duration::from_secs(poll_period_seconds);
        let timeout = std::time::Duration::from_secs(timeout_seconds);
        log::info!("Central server busy with another sync session for this site; waiting for it to become idle...");
        loop {
            tokio::time::sleep(poll_period).await;

            match self.get_site_status().await {
                Ok(status) if status.code == SiteStatusCodeV5::Idle => {
                    log::info!("Central server is idle; retrying request");
                    return Ok(());
                }
                Ok(_) => {}
                // Transient poll failures don't mean central is still busy; retry until timeout.
                Err(error) if error.is_transient() => {
                    log::warn!(
                        "Polling central site status failed while waiting for idle (will retry): {:#?}",
                        error
                    );
                }
                Err(error) => return Err(error),
            }

            if start.elapsed().unwrap_or(timeout) >= timeout {
                return Err(self.api_error(
                    route,
                    SyncApiErrorVariantV5::Other(anyhow::anyhow!(
                        "Timed out waiting for central server to become idle"
                    )),
                ));
            }
        }
    }
}

// When central is busy with another sync session for this site, poll site status
// this often, up to this long, before giving up.
pub(crate) const CENTRAL_BUSY_POLL_PERIOD_SECONDS: u64 = 15;
pub(crate) const CENTRAL_BUSY_TIMEOUT_SECONDS: u64 = 30 * 60;

// A transient transport failure on an idempotent read is retried in place, waiting this
// long before each attempt. Attempts reset after any successful batch, so a long pull
// isn't capped globally - only a persistently broken connection gives up.
//
// The first retry is immediate: a dropped connection is usually a momentary blip (proxy
// dropping a long-lived connection, NAT timeout, network handover) that's over by the time
// the next packet goes out, and `with_retries` retries transport failures with no wait at
// all. The later waits cover what an instant retry can't - an outage lasting seconds, or a
// central busy enough to be dropping connections, where retrying instantly would just burn
// the attempt budget in a few hundred milliseconds.
pub(crate) const TRANSIENT_RETRY_DELAYS_SECONDS: [u64; 3] = [0, 5, 30];

/// "immediately" / "in 5s" - so the retry log reads properly when the delay is zero.
pub(crate) fn retry_delay_description(delay_seconds: u64) -> String {
    if delay_seconds == 0 {
        "immediately".to_string()
    } else {
        format!("in {}s", delay_seconds)
    }
}

#[derive(Error, Debug)]
pub enum ParsingResponseError {
    /// The connection dropped part-way through the response body (reset, incomplete
    /// message). Nothing was parsed - the body never arrived in full - so this is a
    /// transport failure and the request can be retried.
    #[error("Connection dropped while reading response body")]
    ConnectionDropped(#[source] reqwest::Error),
    #[error("Cannot retrieve response body")]
    CannotGetTextResponse(#[from] reqwest::Error),
    #[error("Could not parse response body, response: '{response_text}'")]
    ParseError {
        source: serde_json::Error,
        response_text: String,
    },
}

impl ParsingResponseError {
    /// Classify a failed body read at the point it fails, so callers match on a variant
    /// instead of re-deriving this from the error chain.
    ///
    /// Signature-based only: a genuine idle timeout stays `CannotGetTextResponse`, since
    /// sync v5 deliberately doesn't retry those (see `with_retries_opts` -
    /// server-side work continues after the client gives up, and retrying overlaps it).
    pub(crate) fn from_body_read_error(error: reqwest::Error) -> Self {
        if !error.is_status() && !error.is_builder() && util::chain_contains_transient_drop(&error)
        {
            Self::ConnectionDropped(error)
        } else {
            Self::CannotGetTextResponse(error)
        }
    }
}

pub(crate) async fn to_json<T: DeserializeOwned>(
    response: Response,
) -> Result<T, ParsingResponseError> {
    let url = util::redact_url_for_log(response.url());
    let started = std::time::Instant::now();
    // TODO not owned (to avoid double parsing)
    let response_text = match response.text().await {
        Ok(text) => text,
        // Headers already logged a successful response, so without this the log just
        // stops - no "API body read" line, no explanation. Say what broke, here.
        Err(error) => {
            let error = ParsingResponseError::from_body_read_error(error);
            log::warn!(
                "API body read failed: url '{}', after {:.1}s: {}",
                url,
                started.elapsed().as_secs_f64(),
                util::format_error(&error),
            );
            return Err(error);
        }
    };
    let elapsed = started.elapsed();
    let bytes = response_text.len();
    let kb_per_sec = (bytes as f64 / 1024.0) / elapsed.as_secs_f64().max(0.001);
    log::info!(
        "API body read: url '{}', {} bytes in {:.1}s ({:.1} KB/s)",
        url,
        bytes,
        elapsed.as_secs_f64(),
        kb_per_sec,
    );
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

// OMS Central does not yet do auth validation for site credentials
// So we call Legacy central server for this
// (Use sync API for simplest auth)
pub async fn validate_site_auth(
    ctx: &ServiceContext,
    sync_v5_settings: &SyncApiSettings,
) -> Result<SiteInfoV5, CentralApiError> {
    // We need to ignore the OG server URL provided by the remote and ensure we use the one that the OMS central server is expecting
    let kv_repo = KeyValueStoreRepository::new(&ctx.connection);
    let kv_url = kv_repo
        .get_string(KeyType::SettingsSyncUrl)?
        .ok_or_else(|| {
            CentralApiError::InternalError("Key Value Store missing sync URL".to_string())
        })?;
    let sync_v5_settings = sync_v5_settings.clone();
    let sync_v5_settings = SyncApiSettings {
        server_url: kv_url,
        ..sync_v5_settings
    };
    let response = SyncApiV5::new(sync_v5_settings)
        .map_err(|e| CentralApiError::ConnectionError(format_error(&e)))?
        .get_site_info()
        .await
        .map_err(|e| CentralApiError::LegacyServerError(format_error(&e)))?;

    Ok(response)
}

#[cfg(test)]
mod tests {
    use httpmock::{Method::POST, MockServer};
    use reqwest::header::AUTHORIZATION;
    use util::assert_matches;

    use super::*;

    /// A dropped response body while polling must not abort the wait: the poll loop
    /// tolerates it via `is_transient()` and keeps going, so a truncated first reply
    /// followed by a valid `Idle` reply still resolves to `Ok`.
    #[actix_rt::test]
    async fn test_wait_until_central_idle_retries_dropped_body() {
        use crate::sync::api::test_helpers::{ScriptedResponse, ScriptedServer};

        let server = ScriptedServer::start(vec![
            ScriptedResponse::TruncatedBody {
                content_length: 500,
                body: r#"{"cod"#,
            },
            ScriptedResponse::Complete(
                r#"{ "code": "idle", "message": "", "data": null }"#.to_string(),
            ),
        ]);

        let api = SyncApiV5::new_test(server.url(), "", "", "site_id");

        // 0s poll period keeps the test fast; the loop still makes two requests.
        let result = api.wait_until_central_idle(0, 30).await;

        assert!(result.is_ok(), "Expected Ok, got {:#?}", result);
    }

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

    /// A transient (connection) failure polling `/sync/v5/site_status` must not abort the wait
    /// outright - it should be tolerated and retried until the timeout below, same as central
    /// genuinely still being busy. (Old behaviour: a bare `?` on the failing poll would return
    /// `Err` immediately here, on the very first iteration, well before the 1s timeout - this is
    /// the regression this PR followup fixes.)
    #[actix_rt::test]
    async fn test_wait_until_central_idle_tolerates_transient_poll_errors() {
        let api = SyncApiV5::new_test("http://localhost:9999", "", "", "site_id");

        let result = api.wait_until_central_idle(0, 1).await;

        assert_matches!(
            result,
            Err(SyncApiError {
                source: SyncApiErrorVariantV5::Other(_),
                ..
            })
        );
    }
}
