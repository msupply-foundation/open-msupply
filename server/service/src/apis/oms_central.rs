use super::api_on_central::{NameStoreJoinParams, SiteAuth};
use reqwest::{
    header::{HeaderMap, HeaderValue, AUTHORIZATION},
    Url,
};
use serde::de::DeserializeOwned;
use serde::Deserialize;
use util::{with_retries, RetrySeconds};

// Non-sync related APIs on the OMS Central server
pub struct OmsCentralApi {
    server_url: Url,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ApiResponse<T> {
    Ok(T),
    Err(ApiError),
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ApiError {
    pub code: String,
    pub message: String,
}

#[derive(Debug)]
pub enum OmsCentralApiError {
    AuthenticationFailed,
    ConnectionError(reqwest::Error),
    InternalError(String),
}

pub fn build_auth_headers(auth: &SiteAuth) -> Result<HeaderMap, OmsCentralApiError> {
    let mut headers = HeaderMap::new();

    let bearer = HeaderValue::from_str(&format!("Bearer {}", auth.token))
        .map_err(|e| OmsCentralApiError::InternalError(e.to_string()))?;
    headers.insert(AUTHORIZATION, bearer);

    let hardware_id = HeaderValue::from_str(&auth.hardware_id)
        .map_err(|e| OmsCentralApiError::InternalError(e.to_string()))?;
    headers.insert("HardwareId", hardware_id);

    let app_version = HeaderValue::from_str(&auth.app_version.to_string())
        .map_err(|e| OmsCentralApiError::InternalError(e.to_string()))?;
    headers.insert("appVersion", app_version);

    Ok(headers)
}

pub async fn parse_api_response<T: DeserializeOwned>(
    response: reqwest::Response,
) -> Result<T, OmsCentralApiError> {
    let parsed: ApiResponse<T> = response
        .json()
        .await
        .map_err(OmsCentralApiError::ConnectionError)?;

    match parsed {
        ApiResponse::Ok(payload) => Ok(payload),
        ApiResponse::Err(ApiError { code, message }) if code == "Unauthorized" => {
            log::warn!("OMS central rejected sync v7 auth: {message}");
            Err(OmsCentralApiError::AuthenticationFailed)
        }
        ApiResponse::Err(ApiError { code, message }) => Err(OmsCentralApiError::InternalError(
            format!("{code}: {message}"),
        )),
    }
}

impl OmsCentralApi {
    pub fn new(server_url: Url) -> Self {
        OmsCentralApi { server_url }
    }

    /// Creates/updates a name_store_join
    pub async fn name_store_join(
        &self,
        body: NameStoreJoinParams,
    ) -> Result<(), OmsCentralApiError> {
        let response = with_retries(RetrySeconds::default(), |client| {
            client
                .post(self.server_url.join("/central/name-store-join").unwrap())
                .json(&body)
        })
        .await
        .map_err(OmsCentralApiError::ConnectionError)?;

        match response.status() {
            StatusCode::OK => Ok(()),
            StatusCode::UNAUTHORIZED => Err(OmsCentralApiError::AuthenticationFailed),
            _ => {
                let text = response
                    .text()
                    .await
                    .map_err(OmsCentralApiError::ConnectionError)?;

                Err(OmsCentralApiError::InternalError(text))
            }
        }
    }
}
