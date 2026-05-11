use serde::{Deserialize, Serialize};

use super::{response_or_err, ApiResponse};
use repository::{migrations::Version, syncv7::SyncError};
use util::{with_retries, RetrySeconds};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetTokenInput {
    pub version: Version,
    pub name: String,
    pub password_sha256: String,
    pub hardware_id: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GetTokenOutput {
    pub token: String,
    pub site_id: i32,
    pub central_site_id: i32,
}

pub type Response = ApiResponse<GetTokenOutput>;
pub(crate) static ROUTE: &str = "get_token";

pub async fn get_token(
    base_url: &reqwest::Url,
    input: GetTokenInput,
) -> Result<GetTokenOutput, SyncError> {
    let url = base_url
        .join("central/sync_v7/")
        .unwrap()
        .join(ROUTE)
        .unwrap();

    let result = with_retries(RetrySeconds::default(), |client| {
        client.post(url.clone()).json(&input)
    })
    .await;

    let res = response_or_err(result, url).await;
    match res {
        Ok(ApiResponse::Ok(output)) => Ok(output),
        Ok(ApiResponse::Err(error)) => Err(error),
        Err(error) => Err(error),
    }
}
