use reqwest::{Client, StatusCode, Url};

use super::api_on_central::NameStoreJoinParams;

// Non-sync related APIs on the OMS Central server
pub struct OmsCentral {
    server_url: Url,
    client: Client,
    /// Username to authenticate with the central server. For the backend this is usually the site
    /// name.
    username: String,
    /// For example, the site password which is also used for sync.
    password_sha256: String,
}

#[derive(Debug)]
pub enum OmsCentralError {
    AuthenticationFailed,
    ConnectionError(reqwest::Error),
    InternalError(String),
}

impl OmsCentral {
    pub fn new(client: Client, server_url: Url, username: &str, password_sha256: &str) -> Self {
        OmsCentral {
            server_url,
            client,
            username: username.to_string(),
            password_sha256: password_sha256.to_string(),
        }
    }

    /// Creates/updates a name_store_join
    pub async fn name_store_join(&self, body: NameStoreJoinParams) -> Result<(), OmsCentralError> {
        let response = self
            .client
            .post(self.server_url.join("/central/name-store-join").unwrap())
            .json(&body)
            .basic_auth(&self.username, Some(&self.password_sha256))
            .send()
            .await
            .map_err(OmsCentralError::ConnectionError)?;

        match response.status() {
            StatusCode::OK => Ok(()),
            StatusCode::UNAUTHORIZED => Err(OmsCentralError::AuthenticationFailed),
            _ => {
                let text = response
                    .text()
                    .await
                    .map_err(OmsCentralError::ConnectionError)?;

                Err(OmsCentralError::InternalError(text))
            }
        }
    }
}
