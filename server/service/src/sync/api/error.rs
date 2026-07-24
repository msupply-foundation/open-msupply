use super::*;
use reqwest::{Response, StatusCode, Url};
use serde::{
    de::{value::StrDeserializer, IntoDeserializer},
    Deserialize, Deserializer, Serialize, Serializer,
};
use thiserror::Error;
use url::ParseError;

#[derive(Error, Debug)]
#[error("Sync api error, url: '{url}', route: '{route}'")]
pub struct SyncApiError {
    pub source: SyncApiErrorVariantV5,
    pub(crate) url: Url,
    pub(crate) route: String,
}

#[derive(Error, Debug)]
pub enum SyncApiErrorVariantV5 {
    #[error("status: '{status}'")]
    ParsedError {
        status: StatusCode,
        source: ParsedError,
    },
    #[error("status: '{status}' text: '{text}'")]
    AsText { status: StatusCode, text: String },
    #[error("Cannot parse error, status: '{status}'")]
    ErrorParsingError {
        status: StatusCode,
        source: reqwest::Error,
    },
    #[error("Connection problem")]
    ConnectionError(#[from] reqwest::Error),
    #[error("Could not parse response")]
    ResponseParsingError(#[from] ParsingResponseError),
    #[error("Could not parse url")]
    FailToParseUrl(#[from] ParseError),
    #[error("Unknown api error")]
    Other(#[source] anyhow::Error),
}

#[derive(Error, Debug, Serialize, Deserialize)]
#[error("code: '{code:?}' message: '{message}' data: '{}'", serde_json::to_string(data).unwrap())]
pub struct ParsedError {
    #[serde(serialize_with = "sync_error_code_v5_se")]
    #[serde(deserialize_with = "sync_error_code_v5_de")]
    pub code: SyncErrorCodeV5,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncErrorCodeV5 {
    SiteNameNotFound,
    SiteIncorrectPassword,
    SiteIncorrectHardwareId,
    SiteHasNoStore,
    SiteAuthTimeout,
    ApiVersionIncompatible,
    Other(String),
}

// Below helps serialise and deserialise the Other variant
pub fn sync_error_code_v5_de<'de, D: Deserializer<'de>>(d: D) -> Result<SyncErrorCodeV5, D::Error> {
    // Deserialize to string, try to deserialize string to the num, if fail use string
    let as_string = String::deserialize(d)?;
    let str_d: StrDeserializer<D::Error> = as_string.as_str().into_deserializer();
    SyncErrorCodeV5::deserialize(str_d).or(Ok(SyncErrorCodeV5::Other(as_string)))
}
pub fn sync_error_code_v5_se<S: Serializer>(
    value: &SyncErrorCodeV5,
    s: S,
) -> Result<S::Ok, S::Error> {
    if let SyncErrorCodeV5::Other(string) = value {
        string.serialize(s)
    } else {
        value.serialize(s)
    }
}
/// Error is under 'error' field, want to reduce nesting in SyncApiErrorVariant and serialize error
/// to this struct first and then extract ParsedError to be passed to SyncApiErrorVariant
#[derive(Deserialize)]
struct ErrorWrapper {
    error: ParsedError,
}

impl SyncApiErrorVariantV5 {
    pub(crate) async fn from_response_and_status(status: StatusCode, response: Response) -> Self {
        let error = match to_json::<ErrorWrapper>(response).await {
            Ok(ErrorWrapper { error: source }) => {
                return SyncApiErrorVariantV5::ParsedError { source, status }
            }
            Err(error) => error,
        };

        use ParsingResponseError::*;
        match error {
            CannotGetTextResponse(source) => {
                SyncApiErrorVariantV5::ErrorParsingError { status, source }
            }
            ParseError {
                response_text: text,
                ..
            } => SyncApiErrorVariantV5::AsText { status, text },
        }
    }
}

impl SyncApiV5 {
    pub(crate) fn api_error(&self, route: &str, source: SyncApiErrorVariantV5) -> SyncApiError {
        SyncApiError {
            url: self.url.clone(),
            route: route.to_string(),
            source,
        }
    }
}

impl SyncApiError {
    pub fn new_test(error: SyncApiErrorVariantV5) -> Self {
        SyncApiError {
            source: error,
            url: Url::parse("http://localhost").unwrap(),
            route: "".to_string(),
        }
    }

    pub(crate) fn is_connection(&self) -> bool {
        matches!(self.source, SyncApiErrorVariantV5::ConnectionError(_))
    }

    pub(crate) fn is_unknown(&self) -> bool {
        matches!(self.source, SyncApiErrorVariantV5::Other(_))
    }

    /// Transient transport-level failure (dropped connection, unknown/unparseable error).
    /// Safe to retry within a bounded polling loop rather than aborting it outright.
    pub(crate) fn is_transient(&self) -> bool {
        self.is_connection() || self.is_unknown()
    }

    /// Central is busy with another session for this site (sync / integration / initialisation in
    /// progress). Caller should wait for central to be idle and retry.
    pub(crate) fn is_central_busy(&self) -> bool {
        matches!(
            &self.source,
            SyncApiErrorVariantV5::ParsedError { source, .. }
                if matches!(
                    &source.code,
                    SyncErrorCodeV5::Other(code)
                        if code == "sync_is_running"
                            || code == "integration_in_progress"
                            || code == "initialisation_in_progress"
                )
        )
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use httpmock::{Method::POST, MockServer};
    use util::assert_matches;

    #[actix_rt::test]
    async fn test_errors() {
        // Connection error
        // "http://localhost:9999" = unreachable url
        let result = create_api("http://localhost:9999", "", "")
            .post_initialise()
            .await
            .expect_err("Should result in error");

        assert_matches!(
            result,
            SyncApiError {
                source: SyncApiErrorVariantV5::ConnectionError { .. },
                ..
            }
        );
        assert_eq!(
            result.to_string(),
            "Sync api error, url: 'http://localhost:9999/', route: '/sync/v5/initialise'"
        );

        // Service Unavailable (empty string result)
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        mock_server.mock(|when, then| {
            when.method(POST).path("/sync/v5/initialise");
            then.status(503);
        });

        let result = create_api(&url, "", "")
            .post_initialise()
            .await
            .expect_err("Should result in error");
        assert_matches!(
            result,
            SyncApiError {
                source: SyncApiErrorVariantV5::AsText {
                    status: StatusCode::SERVICE_UNAVAILABLE,
                    ..
                },
                ..
            }
        );

        // Service Unavailable
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(POST).path("/sync/v5/initialise");
            then.status(503).body(
                r#"{
                    "error": {
                        "code": "sync_is_running",
                        "message": "Sync is already running - try again later",
                        "data": null
                    }
                }"#,
            );
        });

        let result = create_api(&url, "", "")
            .post_initialise()
            .await
            .expect_err("Should result in error");

        mock.assert();
        assert_matches!(
            result,
            SyncApiError {
                source: SyncApiErrorVariantV5::ParsedError {
                    status: StatusCode::SERVICE_UNAVAILABLE,
                    ..
                },
                ..
            }
        );

        // Service Unavailable (can't parse error)
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(POST).path("/sync/v5/initialise");
            then.status(503).body(r#"some plain text error"#);
        });

        let result = create_api(&url, "", "")
            .post_initialise()
            .await
            .expect_err("Should result in error");

        mock.assert();
        assert_matches!(
            result,
            SyncApiError {
                source: SyncApiErrorVariantV5::AsText {
                    status: StatusCode::SERVICE_UNAVAILABLE,
                    ..
                },
                ..
            }
        );

        // Incorrect hardware id
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(POST).path("/sync/v5/initialise");
            then.status(401).body(
                r#"{
                "error": {
                    "code": "site_incorrect_hardware_id",
                    "message": "Site hardware ID does not match",
                    "data": null
                    }
                }"#,
            );
        });

        let result = create_api(&url, "", "")
            .post_initialise()
            .await
            .expect_err("Should result in error");

        mock.assert();

        assert_matches!(
            result,
            SyncApiError {
                source: SyncApiErrorVariantV5::ParsedError {
                    status: StatusCode::UNAUTHORIZED,
                    source: ParsedError {
                        code: SyncErrorCodeV5::SiteIncorrectHardwareId,
                        data: None,
                        ..
                    }
                },
                ..
            }
        );

        // Incorrect hardware id
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(POST).path("/sync/v5/initialise");
            then.status(409).body(
                r#"{
                    "error": {
                        "code": "api_version_incompatible",
                        "message": "Api version is not compatible",
                        "data": {
                            "major": 1,
                            "minor": 1
                        }
                    }
                }"#,
            );
        });

        let result = create_api(&url, "", "")
            .post_initialise()
            .await
            .expect_err("Should result in error");

        mock.assert();

        assert_matches!(
            result,
            SyncApiError {
                source: SyncApiErrorVariantV5::ParsedError {
                    status: StatusCode::CONFLICT,
                    source: ParsedError {
                        code: SyncErrorCodeV5::ApiVersionIncompatible,
                        data: Some(_),
                        ..
                    }
                },
                ..
            }
        );
    }

    /// The three transient "central busy" codes must classify as busy (so callers poll and
    /// retry instead of failing). Connection / unrelated errors must not.
    #[actix_rt::test]
    async fn test_central_busy_classification() {
        // Helper: stand up a mock that returns `code` with 503 on /initialise, and return
        // the resulting parsed error.
        async fn busy_error(code: &str) -> SyncApiError {
            let mock_server = MockServer::start();
            let url = mock_server.base_url();
            let body = format!(
                r#"{{ "error": {{ "code": "{}", "message": "busy", "data": null }} }}"#,
                code
            );
            mock_server.mock(|when, then| {
                when.method(POST).path("/sync/v5/initialise");
                then.status(503).body(body);
            });
            create_api(&url, "", "")
                .post_initialise()
                .await
                .expect_err("Should result in error")
        }

        // All three transient codes must classify as central-busy.
        for code in [
            "initialisation_in_progress",
            "sync_is_running",
            "integration_in_progress",
        ] {
            let result = busy_error(code).await;
            assert!(result.is_central_busy(), "{} should be central-busy", code);
        }

        // `initialisation_in_progress` parses as an `Other` 503 code.
        let result = busy_error("initialisation_in_progress").await;
        assert_matches!(
            &result,
            SyncApiError {
                source: SyncApiErrorVariantV5::ParsedError {
                    status: StatusCode::SERVICE_UNAVAILABLE,
                    source: ParsedError {
                        code: SyncErrorCodeV5::Other(_),
                        ..
                    }
                },
                ..
            }
        );

        // An unrelated 503 code must NOT be treated as busy.
        let result = busy_error("some_other_error").await;
        assert!(!result.is_central_busy());

        // A connection error must NOT be treated as busy.
        let result = create_api("http://localhost:9999", "", "")
            .post_initialise()
            .await
            .expect_err("Should result in error");
        assert!(!result.is_central_busy());
        assert!(result.is_connection());
    }

    #[actix_rt::test]
    async fn test_is_transient() {
        // Connection error - transient (safe to retry within a poll loop).
        let connection_error = create_api("http://localhost:9999", "", "")
            .post_initialise()
            .await
            .expect_err("Should result in error");
        assert!(connection_error.is_transient());

        // Unknown error - also transient.
        let unknown_error =
            SyncApiError::new_test(SyncApiErrorVariantV5::Other(anyhow::anyhow!("boom")));
        assert!(unknown_error.is_transient());

        // A parsed business error (e.g. central-busy) is not transient - it's an authoritative
        // response, not a transport failure, so it shouldn't be silently retried as such.
        let parsed_error = SyncApiError::new_test(SyncApiErrorVariantV5::ParsedError {
            status: StatusCode::SERVICE_UNAVAILABLE,
            source: ParsedError {
                code: SyncErrorCodeV5::Other("initialisation_in_progress".to_string()),
                message: "busy".to_string(),
                data: None,
            },
        });
        assert!(!parsed_error.is_transient());
    }
}
