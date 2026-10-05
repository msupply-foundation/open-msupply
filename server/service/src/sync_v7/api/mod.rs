use crate::{
    service_provider::ServiceProvider,
    sync::api::{DroppedBodyRetries, ParsingResponseError},
};
use repository::{migrations::Version, syncv7::SyncError, KeyType, KeyValueStoreRepository};
use reqwest::{
    header::{HeaderMap, HeaderValue, IntoHeaderName, AUTHORIZATION},
    Response,
};
use serde::{de::DeserializeOwned, Serialize};
use util::{format_error, with_retries, RetrySeconds};

pub mod download_file;
pub mod get_token;
pub mod patient_data_for_site;
pub mod patient_search;
pub mod pull;
pub mod push;
pub mod status;

pub const HARDWARE_ID_HEADER: &str = "hardware-id";
pub const APP_VERSION_HEADER: &str = "app-version";
pub const APP_NAME_HEADER: &str = "app-name";

#[derive(Clone, Debug)]
pub struct Common {
    pub token: String,
    pub hardware_id: String,
    pub version: Version,
    /// The remote's client-application name (e.g. "Open mSupply Desktop"). Reported
    /// like `version` so central can record it on the site row. See #11784.
    pub app_name: String,
}

impl Common {
    pub fn load(service_provider: &ServiceProvider) -> Result<Self, SyncError> {
        let ctx = service_provider
            .basic_context()
            .map_err(|e| SyncError::Other(format_error(&e)))?;

        let token = KeyValueStoreRepository::new(&ctx.connection)
            .get_string(KeyType::SettingsSyncV7Token)?
            .ok_or(SyncError::TokenNotFound)?;

        let hardware_id = service_provider
            .app_data_service
            .get_hardware_id()
            .map_err(|_| SyncError::FailedToGetHardwareId)?;

        Ok(Common {
            token,
            hardware_id,
            version: Version::from_package_json(),
            app_name: crate::sync::api::APP_NAME.to_string(),
        })
    }

    pub fn from_header_values(
        authorization: Option<&str>,
        hardware_id: Option<&str>,
        app_version: Option<&str>,
        app_name: Option<&str>,
    ) -> Result<Self, SyncError> {
        let token = authorization
            .and_then(|s| s.split_at_checked(7))
            .filter(|(prefix, _)| prefix.eq_ignore_ascii_case("Bearer "))
            .map(|(_, token)| token.to_string())
            .ok_or_else(|| {
                SyncError::MissingAuthHeader(
                    "missing or incorrect Authorization header".to_string(),
                )
            })?;

        let hardware_id = hardware_id
            .ok_or_else(|| SyncError::MissingAuthHeader("missing hardware-id header".to_string()))?
            .to_string();

        let version = app_version.map(Version::from_str).ok_or_else(|| {
            SyncError::MissingAuthHeader("missing app-version header".to_string())
        })?;

        let app_name = app_name
            .ok_or_else(|| SyncError::MissingAuthHeader("missing app-name header".to_string()))?
            .to_string();

        Ok(Common {
            token,
            hardware_id,
            version,
            app_name,
        })
    }

    pub fn to_auth_headers(&self) -> Result<HeaderMap, SyncError> {
        let mut headers = HeaderMap::new();
        insert_header(
            &mut headers,
            AUTHORIZATION,
            &format!("Bearer {}", self.token),
        )?;
        insert_header(&mut headers, HARDWARE_ID_HEADER, &self.hardware_id)?;
        insert_header(&mut headers, APP_VERSION_HEADER, &self.version.to_string())?;
        insert_header(&mut headers, APP_NAME_HEADER, &self.app_name)?;
        Ok(headers)
    }
}

fn insert_header<K: IntoHeaderName>(
    headers: &mut HeaderMap,
    name: K,
    value: &str,
) -> Result<(), SyncError> {
    let value = HeaderValue::from_str(value).map_err(|e| SyncError::Other(e.to_string()))?;
    headers.insert(name, value);
    Ok(())
}

pub type ApiResponse<O> = Result<O, SyncError>;

#[derive(Clone)]
pub(crate) struct SyncApiV7 {
    pub(crate) url: reqwest::Url,
    pub(crate) auth_headers: HeaderMap,
}

impl SyncApiV7 {
    pub fn new(service_provider: &ServiceProvider, sync_url: &str) -> Result<Self, SyncError> {
        let common = Common::load(service_provider)?;
        let auth_headers = common.to_auth_headers()?;
        let url = sync_url
            .parse()
            .map_err(|e: url::ParseError| SyncError::ConnectionError {
                url: sync_url.to_string(),
                e: format!("Failed to parse central server url: {e}"),
            })?;
        Ok(SyncApiV7 { url, auth_headers })
    }

    /// POST `input` to `route`. `with_retries` re-sends it if the connection fails before a
    /// response arrives, and if the response body is cut off (the connection drops, or stalls
    /// past the idle timeout), the same request is sent again under the `DroppedBodyRetries`
    /// policy shared with sync v5/v6. Only use this for requests that are safe to send twice.
    ///
    /// The budget is per call, so a pull gets a fresh one for every batch - only a
    /// persistently broken connection gives up.
    async fn request_with_body_retry<I: Serialize, O: DeserializeOwned>(
        &self,
        route: &str,
        input: I,
    ) -> Result<O, SyncError> {
        let description = format!("Sync v7 {route}");
        let mut retries = DroppedBodyRetries::default();
        loop {
            match self.attempt(route, &input).await {
                Err(RequestError::BodyCutOff { error, .. })
                    if retries.wait_before_retry(&description, &error).await => {}
                result => return result.map_err(SyncError::from),
            }
        }
    }

    async fn attempt<I: Serialize, O: DeserializeOwned>(
        &self,
        route: &str,
        input: &I,
    ) -> Result<O, RequestError> {
        let url = self
            .url
            .join("central/sync_v7/")
            .unwrap()
            .join(route)
            .unwrap();
        let auth_headers = self.auth_headers.clone();

        let result = with_retries(RetrySeconds::default(), |client| {
            client
                .post(url.clone())
                .headers(auth_headers.clone())
                .json(input)
        })
        .await;

        match response_or_err(result, url).await? {
            ApiResponse::Ok(output) => Ok(output),
            ApiResponse::Err(error) => Err(error.into()),
        }
    }
}

enum RequestError {
    /// The response body never arrived in full. Nothing was parsed, so this is a transport
    /// failure, and a read can be re-sent. Either:
    /// - the connection ended part-way through (reset, abort, early EOF) - including Android
    ///   closing its sockets when it drops a network, and a TLS close without `close_notify`
    ///   (see `util::chain_contains_transient_drop`), or
    /// - the body timed out: TCP keepalive gave up on a path that went silent (about 30s), or,
    ///   on a connection still alive but sending nothing, the 5-minute idle read timeout.
    ///
    /// Unlike sync v5, a timeout is re-sent too. Body bytes only stream once central has
    /// finished handling the request, so a re-send can't overlap work still running there.
    BodyCutOff {
        url: String,
        error: ParsingResponseError,
    },
    Sync(SyncError),
}

impl From<SyncError> for RequestError {
    fn from(error: SyncError) -> Self {
        RequestError::Sync(error)
    }
}

impl From<RequestError> for SyncError {
    fn from(error: RequestError) -> Self {
        match error {
            // A connection problem, so report it as one rather than `Other`.
            RequestError::BodyCutOff { url, error } => SyncError::ConnectionError {
                url,
                e: format_error(&error),
            },
            RequestError::Sync(error) => error,
        }
    }
}

/// Connect failures, timeouts and drops before the response are all connection problems,
/// whichever retry layer gave up, so they're reported as `SyncError::ConnectionError`, the
/// same as a dropped body.
pub(super) fn is_connection_problem(error: &reqwest::Error) -> bool {
    error.is_connect() || error.is_timeout() || error.is_request()
}

async fn response_or_err<T: DeserializeOwned>(
    result: Result<Response, reqwest::Error>,
    url: reqwest::Url,
) -> Result<T, RequestError> {
    let response = match result {
        Ok(result) => result,
        Err(error) => {
            let formatted_error = format_error(&error);
            if is_connection_problem(&error) {
                // InvalidContentType is rustls signalling it received plaintext instead of a TLS
                // handshake — happens when the URL uses https:// but the server is HTTP only.
                let e = if formatted_error.contains("InvalidContentType") {
                    format!(
                        "Server is not configured for HTTPS — try http:// instead. ({})",
                        formatted_error
                    )
                } else {
                    formatted_error
                };
                return Err(SyncError::ConnectionError {
                    url: url.to_string(),
                    e,
                }
                .into());
            } else {
                return Err(SyncError::Other(formatted_error).into());
            }
        }
    };

    let log_url = util::redact_url_for_log(response.url());
    let started = std::time::Instant::now();
    let response_text = match response.text().await {
        Ok(text) => text,
        // Headers already logged a successful response, so without this the log just stops.
        // Say what broke, here.
        Err(error) => {
            let error = ParsingResponseError::from_body_read_error(error);
            log::warn!(
                "API body read failed: url '{}', after {:.1}s: {}",
                log_url,
                started.elapsed().as_secs_f64(),
                format_error(&error),
            );
            return Err(match error {
                // `from_body_read_error` keeps timeouts out of `ConnectionDropped` for v5's
                // sake. v7 re-sends those too - see `RequestError::BodyCutOff`.
                ParsingResponseError::ConnectionDropped(_) => RequestError::BodyCutOff {
                    url: url.to_string(),
                    error,
                },
                ParsingResponseError::CannotGetTextResponse(ref source) if source.is_timeout() => {
                    RequestError::BodyCutOff {
                        url: url.to_string(),
                        error,
                    }
                }
                other => SyncError::Other(format_error(&other)).into(),
            });
        }
    };
    util::log_body_read(&log_url, response_text.len(), started.elapsed());

    let result = serde_json::from_str(&response_text).map_err(|e| SyncError::ParsingError {
        e: format_error(&e),
        response_text,
    })?;

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::api::test_helpers::{ScriptedResponse, ScriptedServer};

    fn api(url: &str) -> SyncApiV7 {
        SyncApiV7 {
            url: url.parse().unwrap(),
            auth_headers: HeaderMap::new(),
        }
    }

    fn truncated() -> ScriptedResponse {
        ScriptedResponse::TruncatedBody {
            content_length: 1000,
            body: r#"{"Ok": {"siteId": 1, "cen"#,
        }
    }

    /// Reads other than pull use `request_with_body_retry` too, so they get the same retry.
    #[actix_rt::test]
    async fn site_status_retries_dropped_response_body() {
        let server = ScriptedServer::start(vec![
            truncated(),
            ScriptedResponse::Complete(
                r#"{"Ok": {"siteId": 2, "centralSiteId": 1, "isMultiDeviceSite": false}}"#
                    .to_string(),
            ),
        ]);

        let result = api(server.url()).site_status(()).await;

        assert!(
            matches!(&result, Ok(status::Output { site_id: 2, .. })),
            "Expected Ok, got {:#?}",
            result.err()
        );
    }

    /// Push is safe to send twice, so a cut-off acknowledgement is re-sent and the retry's
    /// `Ok` reply is returned.
    #[actix_rt::test]
    async fn push_retries_dropped_response_body() {
        let server = ScriptedServer::start(vec![
            truncated(),
            ScriptedResponse::Complete(r#"{"Ok": 1}"#.to_string()),
        ]);

        let result = api(server.url()).push(Default::default()).await;

        assert!(
            matches!(&result, Ok(1)),
            "Expected Ok(1), got {:#?}",
            result
        );
    }

    /// A drop before any response arrives is a connection problem too, once the transport
    /// retries run out - not `Other`.
    #[actix_rt::test]
    async fn drop_before_response_is_connection_error() {
        // `with_retries` makes three attempts; a fourth would find the listener closed.
        let server = ScriptedServer::start(vec![
            ScriptedResponse::CloseBeforeResponse,
            ScriptedResponse::CloseBeforeResponse,
            ScriptedResponse::CloseBeforeResponse,
        ]);

        let result = api(server.url()).site_status(()).await;

        assert!(
            matches!(&result, Err(SyncError::ConnectionError { .. })),
            "Unexpected result: {:#?}",
            result.err()
        );
    }

    /// A body that stalls past the idle timeout is re-sent like a dropped one, rather than
    /// failing as `Other`. Calls `response_or_err` directly with a short idle timeout, since
    /// `with_retries` uses the real 5-minute one.
    #[actix_rt::test]
    async fn stalled_response_body_is_cut_off() {
        let server = ScriptedServer::start(vec![ScriptedResponse::StalledBody {
            content_length: 1000,
            body: r#"{"Ok": {"siteId": 1, "cen"#,
            hold: std::time::Duration::from_secs(5),
        }]);
        let url: reqwest::Url = server.url().parse().unwrap();
        let response = reqwest::Client::builder()
            .read_timeout(std::time::Duration::from_millis(200))
            .build()
            .unwrap()
            .post(url.clone())
            .send()
            .await;

        let result = response_or_err::<ApiResponse<status::Output>>(response, url).await;

        match result {
            Err(RequestError::BodyCutOff { error, .. }) => assert!(
                matches!(&error, ParsingResponseError::CannotGetTextResponse(source) if source.is_timeout()),
                "Expected an idle timeout, got {:#?}",
                error
            ),
            Err(RequestError::Sync(error)) => panic!("Expected BodyCutOff, got {:#?}", error),
            Ok(_) => panic!("Expected BodyCutOff, got Ok"),
        }
    }

    fn from_authorization(authorization: Option<&str>) -> Result<Common, SyncError> {
        Common::from_header_values(
            authorization,
            Some("hw-1"),
            Some("1.0.0"),
            Some("Open mSupply Desktop"),
        )
    }

    #[test]
    fn bearer_prefix_is_case_insensitive() {
        for header in [
            "Bearer abc123",
            "bearer abc123",
            "BEARER abc123",
            "BeArEr abc123",
        ] {
            let common = from_authorization(Some(header)).unwrap();
            assert_eq!(common.token, "abc123", "header: {}", header);
        }
    }
}
