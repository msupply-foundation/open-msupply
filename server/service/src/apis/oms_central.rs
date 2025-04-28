use reqwest::{StatusCode, Url};
use util::{with_retries, RetrySeconds};

use super::api_on_central::NameStoreJoinParams;

// Non-sync related APIs on the OMS Central server
pub struct OmsCentralApi {
    server_url: Url,
}

#[derive(Debug)]
pub enum OmsCentralApiError {
    AuthenticationFailed,
    ConnectionError(reqwest::Error),
    InternalError(String),
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
