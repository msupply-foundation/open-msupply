use crate::{apis::api_on_central::SiteAuth, service_provider::ServiceProvider};
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

pub(crate) static VERSION: u32 = 1;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Common {
    pub(crate) version: Version,
    pub(crate) hardware_id: String,
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
    pub(crate) hardware_id: String,
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
            hardware_id,
            auth_headers,
        } = self.clone();

        let url = url.join("central/sync_v7/").unwrap().join(route).unwrap();

        let request = Request {
            input,
            common: Common {
                version: Version::from_package_json(),
                hardware_id,
            },
        };
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

    pub fn load_site_auth(service_provider: &ServiceProvider) -> Result<SiteAuth, SyncError> {
        let ctx = service_provider
            .basic_context()
            .map_err(|e| SyncError::Other(format_error(&e)))?;

        let token = KeyValueStoreRepository::new(&ctx.connection)
            .get_string(KeyType::SettingsSyncTokenV7)
            .map_err(SyncError::DatabaseError)?
            .ok_or_else(|| {
                SyncError::Other("Sync v7 token not set — site must initialise first".to_string())
            })?;

        let hardware_id = service_provider
            .app_data_service
            .get_hardware_id()
            .map_err(|_| SyncError::FailedToGetHardwareId)?;

        Ok(SiteAuth {
            token,
            hardware_id,
            app_version: VERSION,
        })
    }

    pub fn build_auth_headers(auth: &SiteAuth) -> Result<HeaderMap, SyncError> {
        let mut headers = HeaderMap::new();

        let bearer = HeaderValue::from_str(&format!("Bearer {}", auth.token))
            .map_err(|e| SyncError::Other(e.to_string()))?;
        headers.insert(AUTHORIZATION, bearer);

        let hardware_id = HeaderValue::from_str(&auth.hardware_id)
            .map_err(|e| SyncError::Other(e.to_string()))?;
        headers.insert("HardwareId", hardware_id);

        let app_version = HeaderValue::from_str(&auth.app_version.to_string())
            .map_err(|e| SyncError::Other(e.to_string()))?;
        headers.insert("appVersion", app_version);

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
