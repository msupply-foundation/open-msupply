use reqwest::{Client, Url};

use crate::sync::api_v7::{LoginResponseV7, LoginV7Error};

use super::login_v4::{LoginInputV4, LoginResponseV4};

pub struct LoginApiV7 {
    server_url: Url,
    client: Client,
}

impl LoginApiV7 {
    pub fn new(client: Client, server_url: Url) -> Self {
        LoginApiV7 { server_url, client }
    }

    pub async fn login(&self, input: &LoginInputV4) -> Result<LoginResponseV4, LoginV7Error> {
        let response = self
            .client
            .post(self.server_url.join("central_v7/login").unwrap())
            .json(input)
            .send()
            .await
            .map_err(|err| LoginV7Error::ConnectionError(err.to_string()))?;

        // Not checking for status, expecting 200 only, even if there is error
        let response_text = response
            .text()
            .await
            .map_err(|err| LoginV7Error::ConnectionError(err.to_string()))?;

        let result: LoginResponseV7 = serde_json::from_str(&response_text)
            .map_err(|err| LoginV7Error::OtherServerError(err.to_string()))?;

        match result {
            LoginResponseV7::Data(response) => return Ok(response),
            LoginResponseV7::Error(error) => return Err(error),
        }
    }
}
