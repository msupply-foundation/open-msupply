use std::time::Duration;

use reqwest::{ClientBuilder, StatusCode, Url};
use serde::Serialize;

const CONNECTION_TIMEOUT_SEC: u64 = 10;

#[derive(Debug)]
pub enum CentralUserLoginError {
    /// Central responded that the credentials are wrong (HTTP 401).
    InvalidCredentials,
    /// Anything else — network failure, 4xx/5xx other than 401, etc.
    /// The caller should fall back to local hash verification.
    Unreachable(String),
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CentralUserLoginInput<'a> {
    username: &'a str,
    password: &'a str,
}

/// POSTs to `{central_server_url}/central/user/login`.
///
/// `Ok(())` means credentials are valid; `Err` distinguishes "central said no"
/// from "couldn't ask central." The verdict is carried by the HTTP status
/// alone — the response body is ignored.
pub async fn central_user_login(
    central_server_url: &str,
    username: &str,
    password: &str,
) -> Result<(), CentralUserLoginError> {
    let url = Url::parse(central_server_url)
        .and_then(|u| u.join("/central/user/login"))
        .map_err(|e| CentralUserLoginError::Unreachable(format!("invalid central url: {e}")))?;

    let client = ClientBuilder::new()
        .connect_timeout(Duration::from_secs(CONNECTION_TIMEOUT_SEC))
        .build()
        .map_err(|e| CentralUserLoginError::Unreachable(format!("client build failed: {e:?}")))?;

    let response = client
        .post(url)
        .json(&CentralUserLoginInput { username, password })
        .send()
        .await
        .map_err(|e| CentralUserLoginError::Unreachable(format!("send failed: {e}")))?;

    match response.status() {
        StatusCode::OK => Ok(()),
        StatusCode::UNAUTHORIZED => Err(CentralUserLoginError::InvalidCredentials),
        other => Err(CentralUserLoginError::Unreachable(format!(
            "unexpected status: {other}"
        ))),
    }
}
