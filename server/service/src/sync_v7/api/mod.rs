use crate::service_provider::ServiceProvider;
use repository::{migrations::Version, syncv7::SyncError, KeyType, KeyValueStoreRepository};
use reqwest::{
    header::{HeaderMap, HeaderValue, IntoHeaderName, AUTHORIZATION},
    Response,
};
use serde::{de::DeserializeOwned, Serialize};
use util::{format_error, with_retries, RetrySeconds};

pub mod get_token;
pub mod patient_data_for_site;
pub mod patient_search;
pub mod pull;
pub mod push;
pub mod status;

pub const HARDWARE_ID_HEADER: &str = "hardware-id";
pub const APP_VERSION_HEADER: &str = "app-version";

#[derive(Clone, Debug)]
pub struct Common {
    pub token: String,
    pub hardware_id: String,
    pub version: Version,
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
        })
    }

    pub fn from_header_values(
        authorization: Option<&str>,
        hardware_id: Option<&str>,
        app_version: Option<&str>,
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

        Ok(Common {
            token,
            hardware_id,
            version,
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

    pub async fn op<I: Serialize, O: DeserializeOwned>(
        &self,
        route: &str,
        input: I,
    ) -> Result<O, SyncError> {
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
                .json(&input)
        })
        .await;

        let res = response_or_err(result, url).await;
        match res {
            Ok(ApiResponse::Ok(output)) => Ok(output),
            Ok(ApiResponse::Err(error)) => Err(error),
            Err(error) => Err(error),
        }
    }
}

async fn response_or_err<T: DeserializeOwned>(
    result: Result<Response, reqwest::Error>,
    url: reqwest::Url,
) -> Result<T, SyncError> {
    let response = match result {
        Ok(result) => result,
        Err(error) => {
            let formatted_error = format_error(&error);
            if error.is_connect() {
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
                });
            } else {
                return Err(SyncError::Other(formatted_error));
            }
        }
    };

    let response_text = response
        .text()
        .await
        .map_err(|e| SyncError::Other(format_error(&e)))?;

    let result = serde_json::from_str(&response_text).map_err(|e| SyncError::ParsingError {
        e: format_error(&e),
        response_text,
    })?;

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn from_authorization(authorization: Option<&str>) -> Result<Common, SyncError> {
        Common::from_header_values(authorization, Some("hw-1"), Some("1.0.0"))
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
