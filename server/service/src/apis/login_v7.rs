use crate::sync::sync_serde::empty_str_as_option_string;
use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};

pub struct LoginApiV7 {
    server_url: Url,
    client: Client,
}

impl LoginApiV7 {
    pub fn new(client: Client, server_url: Url) -> Self {
        LoginApiV7 { server_url, client }
    }

    // idk maybe need to strip back
    pub async fn login(&self, input: LoginInputV7) -> Result<LoginResponseV4, LoginV4Error> {
        let response = self
            .client
            .post(self.server_url.join("/central_v7/login").unwrap())
            .json(&input)
            .send()
            .await
            .map_err(LoginV4Error::ConnectionError)?;

        let status = response.status();

        if status == reqwest::StatusCode::UNAUTHORIZED {
            return Err(LoginV4Error::Unauthorised);
        }

        let body = response.json::<serde_json::Value>().await;

        match body {
            Ok(body) => {
                if status == reqwest::StatusCode::FORBIDDEN {
                    // Handle account blocked error (i.e. too many failed login attempts)
                    if let Ok(error_body) =
                        serde_json::from_value::<LoginResponseErrorV4>(body.clone())
                    {
                        if error_body.status == "user_login_timeout" {
                            if let Some(timeout_remaining) = error_body.timeout_remaining {
                                return Err(LoginV4Error::AccountBlocked(timeout_remaining));
                            }
                        }
                    }
                }

                let response = serde_json::from_value::<LoginResponseV4>(body)
                    .map_err(LoginV4Error::ParseError)?;

                Ok(response)
            }
            Err(e) => Err(LoginV4Error::ConnectionError(e)),
        }
    }
}
