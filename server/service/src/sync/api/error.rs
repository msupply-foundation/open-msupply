use super::*;
use reqwest::{Response, StatusCode, Url};
use serde::Deserialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SyncApiError {
    #[error("status: ({status}) error: {source}")]
    MappedError {
        source: SyncErrorV5,
        status: StatusCode,
    },
    #[error("Error connecting to server: ({url})")]
    ConnectionError { source: reqwest::Error, url: Url },
    #[error("{0}")]
    ResponseParsingError(ParsingResponseError),
    #[error("{0}")]
    Other(#[from] anyhow::Error),
}

#[derive(Error, Debug, Deserialize)]
pub enum SyncErrorV5 {
    #[error("code: ({code}) message: ({message})")]
    #[serde(rename = "error")]
    ParsedError {
        code: String,
        message: String,
        data: Option<String>,
    },
    #[error("{0}")]
    FullText(String),
}

impl SyncErrorV5 {
    pub(crate) async fn from_response_and_status(
        status: StatusCode,
        response: Response,
    ) -> SyncApiError {
        let error = match to_json::<SyncErrorV5>(response).await {
            Ok(source) => return SyncApiError::MappedError { source, status },
            Err(error) => error,
        };

        use ParsingResponseError::*;
        let source = match error {
            CannotGetTextReponse(_) => {
                SyncErrorV5::FullText("Cannot retreive error body".to_string())
            }
            ParseError {
                source: _,
                response_text,
            } => SyncErrorV5::FullText(response_text),
        };

        SyncApiError::MappedError { source, status }
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
            .await;
        assert_matches!(result, Err(SyncApiError::ConnectionError { .. }));
        assert_eq!(
            format!("{}", result.err().unwrap()),
            "Error connecting to server: (http://localhost:9999/sync/v5/initialise)"
        );

        // Service Unavailable (empty string result)
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        mock_server.mock(|when, then| {
            when.method(POST).path("/sync/v5/initialise");
            then.status(503);
        });

        let result = create_api(&url, "", "").post_initialise().await;
        assert_matches!(
            result,
            Err(SyncApiError::MappedError {
                source: SyncErrorV5::FullText(_),
                status: StatusCode::SERVICE_UNAVAILABLE
            })
        );
        assert_eq!(
            format!("{}", result.err().unwrap()),
            "status: (503 Service Unavailable) error: "
        );

        // Service Unavailableg
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

        let result = create_api(&url, "", "").post_initialise().await;

        mock.assert();
        assert_matches!(
            result,
            Err(SyncApiError::MappedError {
                source: SyncErrorV5::ParsedError { .. },
                status: StatusCode::SERVICE_UNAVAILABLE
            })
        );
        assert_eq!(format!("{}", result.err().unwrap()), "status: (503 Service Unavailable) error: code: (sync_is_running) message: (Sync is already running - try again later)");

        // Service Unavailable (can't parse error)
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock = mock_server.mock(|when, then| {
            when.method(POST).path("/sync/v5/initialise");
            then.status(503).body(r#"some plain text error"#);
        });

        let result = create_api(&url, "", "").post_initialise().await;

        mock.assert();
        assert_matches!(
            result,
            Err(SyncApiError::MappedError {
                source: SyncErrorV5::FullText(_),
                status: StatusCode::SERVICE_UNAVAILABLE
            })
        );
        assert_eq!(
            format!("{}", result.err().unwrap()),
            "status: (503 Service Unavailable) error: some plain text error"
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
                "data": null,
                "status": 401
            }
        }"#,
            );
        });

        let result = create_api(&url, "", "").post_initialise().await;

        mock.assert();

        assert_matches!(
            result,
            Err(SyncApiError::MappedError {
                source: SyncErrorV5::ParsedError { .. },
                status: StatusCode::UNAUTHORIZED
            })
        );
        assert_eq!(format!("{}", result.err().unwrap()), "status: (401 Unauthorized) error: code: (site_incorrect_hardware_id) message: (Site hardware ID does not match)");
    }
}
