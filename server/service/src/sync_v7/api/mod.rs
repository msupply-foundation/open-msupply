use crate::service_provider::ServiceProvider;
use repository::{migrations::Version, syncv7::SyncError, KeyType, KeyValueStoreRepository};
use reqwest::{
    header::{HeaderMap, HeaderValue, AUTHORIZATION},
    Response,
};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use util::{format_error, with_retries, RetrySeconds};

pub mod pull;
pub mod push;
pub mod site_info;
pub mod status;

pub const HARDWARE_ID_HEADER: &str = "hardware-id";
pub const APP_VERSION_HEADER: &str = "app-version";

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Common {
    pub token: String,
    pub hardware_id: String,
    pub version: Version,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Request<I> {
    #[serde(flatten)]
    pub(crate) common: Common,
    #[serde(flatten)]
    pub(crate) input: I,
}

pub type ApiResponse<O> = Result<O, SyncError>;

#[derive(Clone)]
pub(crate) struct SyncApiV7 {
    pub(crate) url: reqwest::Url,
    pub(crate) common: Common,
    pub(crate) auth_headers: HeaderMap,
}

impl SyncApiV7 {
    pub async fn op<I: Serialize, O: DeserializeOwned>(
        &self,
        route: &str,
        input: I,
        // For get_site_info route, this won't be present for api call that deals with initial login
        use_token: bool,
    ) -> Result<O, SyncError> {
        let Self {
            url,
            common,
            auth_headers,
        } = self.clone();

        let url = url.join("central/sync_v7/").unwrap().join(route).unwrap();

        let request = Request { common, input };
        let result = with_retries(RetrySeconds::default(), |client| {
            let mut builder = client.post(url.clone());
            if use_token {
                builder = builder.headers(auth_headers.clone());
            }
            builder.json(&request)
        })
        .await;

        let res = response_or_err(result, url).await;
        let error = match res {
            Ok(ApiResponse::Ok(output)) => return Ok(output),
            Ok(ApiResponse::Err(error)) => error,
            Err(error) => error,
        };

        Err(error)
    }

    pub fn load_site_auth(service_provider: &ServiceProvider) -> Result<Common, SyncError> {
        let ctx = service_provider
            .basic_context()
            .map_err(|e| SyncError::Other(format_error(&e)))?;

        let token = KeyValueStoreRepository::new(&ctx.connection)
            .get_string(KeyType::SettingsSyncV7Token)
            .map_err(SyncError::DatabaseError)?
            .ok_or_else(|| {
                SyncError::Other("Sync v7 token not set — site must initialise first".to_string())
            })?;

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

    pub fn build_auth_headers(common: &Common) -> Result<HeaderMap, SyncError> {
        let mut headers = HeaderMap::new();

        let bearer = HeaderValue::from_str(&format!("Bearer {}", common.token))
            .map_err(|e| SyncError::Other(e.to_string()))?;
        headers.insert(AUTHORIZATION, bearer);

        let hardware_id = HeaderValue::from_str(&common.hardware_id)
            .map_err(|e| SyncError::Other(e.to_string()))?;
        headers.insert(HARDWARE_ID_HEADER, hardware_id);

        let app_version = HeaderValue::from_str(&common.version.to_string())
            .map_err(|e| SyncError::Other(e.to_string()))?;
        headers.insert(APP_VERSION_HEADER, app_version);

        Ok(headers)
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
                return Err(SyncError::ConnectionError {
                    url: url.to_string(),
                    e: formatted_error,
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
