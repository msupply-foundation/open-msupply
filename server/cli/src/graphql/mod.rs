use std::{
    io::{self, Read},
    path::PathBuf,
};

use auth::AUTH_QUERY;
use reqwest::{multipart, RequestBuilder, Url};
use serde::{de::DeserializeOwned, Deserialize, Serialize};

#[derive(Debug)]
pub struct Api {
    url: Url,
    token: String,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize, Serialize)]
struct GraphQlResponse {
    data: Root,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize, Serialize)]
struct Root {
    root: serde_json::Value,
}

mod auth;
pub mod queries_mutations;

#[derive(thiserror::Error, Debug)]
pub enum ApiError {
    #[error("Error while sending request to {1}")]
    SendingRequest(#[source] reqwest::Error, Url),
    #[error("Error while getting text, status {1:?}")]
    GettingText(#[source] reqwest::Error, reqwest::StatusCode),
    #[error("Error parsing gql response: {1}")]
    ParsingJson(#[source] serde_json::Error, String),
    #[error("Error validating typename, expected typename {expected_typename}, result: {json}")]
    ValidatingTypename {
        expected_typename: String,
        json: String,
    },
    #[error("Error opening file, {1}")]
    OpeningFile(#[source] io::Error, PathBuf),
    #[error("Error reading file, {1}")]
    ReadingFile(#[source] io::Error, PathBuf),
}
use service::UploadedFile;
use ApiError as Error;

impl Api {
    pub async fn new_with_token(
        url: Url,
        username: String,
        password: String,
    ) -> Result<Self, Error> {
        let result = _gql(
            &url.join("graphql").unwrap(),
            AUTH_QUERY,
            serde_json::json! ({
              "username": username,
              "password": password,
            }),
            None,
            Some("AuthToken"),
        )
        .await?;

        let token = result["token"].as_str().unwrap().to_string();

        Ok(Api { url, token })
    }

    pub async fn gql(
        &self,
        query: &str,
        variables: serde_json::Value,
        expected_typename: Option<&str>,
    ) -> Result<serde_json::Value, Error> {
        _gql(
            &self.url.join("graphql").unwrap(),
            query,
            variables,
            Some(&self.token),
            expected_typename,
        )
        .await
    }

    pub async fn upload_file(&self, path: PathBuf) -> Result<UploadedFile, Error> {
        let url = self.url.join("upload").unwrap();

        let auth_cooke_value = format!(r#"auth={{"token": "{}"}}"#, self.token);
        let built_request = reqwest::Client::new()
            .post(url.clone())
            .header("Cookie", auth_cooke_value);

        // Add file to request
        let mut file_handle =
            std::fs::File::open(path.clone()).map_err(|e| Error::OpeningFile(e, path.clone()))?;
        let mut file_bytes = Vec::new();
        file_handle
            .read_to_end(&mut file_bytes)
            .map_err(|e| Error::ReadingFile(e, path))?;
        let file_part = multipart::Part::bytes(file_bytes).file_name("upload".to_string());
        let multipart_form = multipart::Form::new().part("files", file_part);
        let built_request = built_request.multipart(multipart_form);

        // Send and return file_id

        send_and_parse(built_request, url).await
    }
}

async fn _gql(
    url: &Url,
    query: &str,
    variables: serde_json::Value,
    token: Option<&str>,
    expected_typename: Option<&str>,
) -> Result<serde_json::Value, Error> {
    let body = serde_json::json!({
        "query": query,
        "variables": variables
    });

    let mut client = reqwest::Client::new().post(url.clone());

    if let Some(token) = token {
        client = client.bearer_auth(token)
    };

    let built_request = client.json(&body);

    let json_result: GraphQlResponse = send_and_parse(built_request, url.clone()).await?;

    let result = json_result.data.root;

    let Some(expected_typename) = expected_typename else {
        return Ok(result);
    };

    if result["__typename"] != expected_typename {
        return Err(Error::ValidatingTypename {
            expected_typename: expected_typename.to_string(),
            json: serde_json::to_string(&result).unwrap(),
        });
    }

    Ok(result)
}

async fn send_and_parse<T: DeserializeOwned>(
    built_request: RequestBuilder,
    url: Url,
) -> Result<T, Error> {
    let response = built_request
        .send()
        .await
        .map_err(|e| Error::SendingRequest(e, url))?;

    let status = response.status();
    let text_result = response
        .text()
        .await
        .map_err(|e| Error::GettingText(e, status))?;

    Ok(serde_json::from_str(&text_result).map_err(|e| Error::ParsingJson(e, text_result))?)
}
