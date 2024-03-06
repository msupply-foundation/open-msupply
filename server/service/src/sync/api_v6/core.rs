use crate::sync::api::{ParsingResponseError, SyncApiSettings};
use reqwest::{Client, Response};
use thiserror::Error;
use url::{ParseError, Url};

use super::*;

// For now port_offset of 2
pub(crate) static PORT_OFFSET: u16 = 2;

#[derive(Debug, Clone)]
pub(crate) struct SyncApiV6 {
    pub(crate) url: Url,
    pub(crate) sync_v5_settings: SyncApiSettings,
}

#[derive(Error, Debug)]
pub enum SyncApiV6CreatingError {
    #[error("Cannot parse url while creating SyncApiV5 instance url: '{0}'")]
    CannotParseSyncUrl(String, #[source] ParseError),
    #[error("Error while creating SyncApiV6 instance")]
    Other(#[source] anyhow::Error),
}

async fn response_or_err(
    result: Result<Response, reqwest::Error>,
) -> Result<SyncPullResponseV6, SyncApiErrorVariantV6> {
    let response = match result {
        Ok(result) => result,
        Err(error) => {
            if error.is_connect() {
                return Err(SyncApiErrorVariantV6::ConnectionError(error));
            } else {
                return Err(SyncApiErrorVariantV6::Other(error.into()));
            }
        }
    };

    // Not checking for status, expecting 200 only, even if there is error
    let response_text = response
        .text()
        .await
        .map_err(ParsingResponseError::CannotGetTextResponse)?;

    let result = serde_json::from_str(&response_text).map_err(|source| {
        ParsingResponseError::ParseError {
            source,
            response_text,
        }
    })?;

    Ok(result)
}

async fn response_or_err_push(
    result: Result<Response, reqwest::Error>,
) -> Result<SyncPushResponseV6, SyncApiErrorVariantV6> {
    let response = match result {
        Ok(result) => result,
        Err(error) => {
            if error.is_connect() {
                return Err(SyncApiErrorVariantV6::ConnectionError(error));
            } else {
                return Err(SyncApiErrorVariantV6::Other(error.into()));
            }
        }
    };

    // Not checking for status, expecting 200 only, even if there is error
    let response_text = response
        .text()
        .await
        .map_err(ParsingResponseError::CannotGetTextResponse)?;

    let result = serde_json::from_str(&response_text).map_err(|source| {
        ParsingResponseError::ParseError {
            source,
            response_text,
        }
    })?;

    Ok(result)
}

pub(crate) fn get_omsupply_central_url(sync_v5_url: &str) -> Result<Url, ParseError> {
    let mut url = Url::parse(sync_v5_url)?;
    // Unwrap is safe unless domain is not http or https, see port_or_know_default()
    url.set_port(Some(url.port_or_known_default().unwrap() + PORT_OFFSET))
        .unwrap();

    Ok(url)
}

impl SyncApiV6 {
    pub fn new(sync_v5_settings: SyncApiSettings) -> Result<Self, SyncApiV6CreatingError> {
        let mut url = get_omsupply_central_url(&sync_v5_settings.server_url).map_err(|error| {
            SyncApiV6CreatingError::CannotParseSyncUrl(sync_v5_settings.server_url.clone(), error)
        })?;

        url = url.join("central/sync/").unwrap();

        Ok(Self {
            url,
            sync_v5_settings,
        })
    }

    pub async fn pull(&self, cursor: u64, batch_size: u32) -> Result<SyncBatchV6, SyncApiErrorV6> {
        let Self {
            sync_v5_settings,
            url,
        } = self;

        let route = "pull";
        let url = url.join(route).unwrap();

        let request = SyncPullRequestV6 {
            cursor,
            batch_size,
            sync_v5_settings: sync_v5_settings.clone(),
        };

        let result = Client::new().post(url.clone()).json(&request).send().await;

        let error = match response_or_err(result).await {
            Ok(SyncPullResponseV6::Data(data)) => return Ok(data),
            Ok(SyncPullResponseV6::Error(error)) => error.into(),
            Err(error) => error.into(),
        };

        Err(SyncApiErrorV6 {
            url,
            route: route.to_string(),
            source: error,
        })
    }

    pub async fn push(&self, batch: SyncBatchV6) -> Result<SyncPushSuccessV6, SyncApiErrorV6> {
        let Self {
            sync_v5_settings,
            url,
        } = self;

        let route = "push";
        let url = url.join(route).unwrap();

        let request = SyncPushRequestV6 {
            batch,
            sync_v5_settings: sync_v5_settings.clone(),
        };

        let result = Client::new().post(url.clone()).json(&request).send().await;

        let error = match response_or_err_push(result).await {
            Ok(SyncPushResponseV6::Data(data)) => return Ok(data),
            Ok(SyncPushResponseV6::Error(error)) => error.into(),
            Err(error) => error.into(),
        };

        Err(SyncApiErrorV6 {
            url,
            route: route.to_string(),
            source: error,
        })
    }
}
