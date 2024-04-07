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
}
