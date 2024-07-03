use reqwest::Client;
use thiserror::Error;
use url::ParseError;

use crate::sync::settings::SyncSettings;

use super::*;

#[derive(Debug, Clone)]
pub(crate) struct SyncApiV7 {
    pub(crate) url: Url,
    pub(crate) sync_settings: SyncSettings,
}

#[derive(Error, Debug)]
pub enum SyncApiV7CreatingError {
    #[error("Cannot parse url while creating SyncApiV7 instance, url: '{0}'")]
    CannotParseSyncUrl(String, #[source] ParseError),
    #[error("Error while creating SyncApiV7 instance")]
    Other(#[source] anyhow::Error),
}

impl SyncApiV7 {
    pub fn new(sync_settings: SyncSettings) -> Result<Self, SyncApiV7CreatingError> {
        let mut url = Url::parse(&sync_settings.url).map_err(|error| {
            SyncApiV7CreatingError::CannotParseSyncUrl(sync_settings.url.clone(), error)
        })?;

        url = url.join("central_v7/sync/").unwrap();

        Ok(Self { url, sync_settings })
    }

    pub async fn pull(
        &self,
        cursor: u64,
        batch_size: u32,
        is_initialised: bool,
    ) -> Result<SyncBatchV7, SyncApiErrorV7> {
        let Self { sync_settings, url } = self;

        let route = "pull";
        let url = url.join(route).unwrap();

        // TODO: can we abstract the common bit?
        let request = SyncPullRequestV7 {
            common: sync_settings.clone(),
            data: PullPayload {
                cursor,
                batch_size,
                is_initialised,
            },
        };

        let result = Client::new().post(url.clone()).json(&request).send().await;

        let error = match response_or_err(result).await {
            Ok(SyncPullResponseV7::Data(data)) => return Ok(data),
            Ok(SyncPullResponseV7::Error(error)) => error.into(),
            Err(error) => error,
        };

        Err(SyncApiErrorV7 {
            url,
            route: route.to_string(),
            source: error,
        })
    }

    pub async fn push(&self, batch: SyncBatchV7) -> Result<SyncPushSuccessV7, SyncApiErrorV7> {
        let Self { sync_settings, url } = self;

        let route = "push";
        let url = url.join(route).unwrap();

        // TODO: can we abstract the common bit?
        let request = SyncPushRequestV7 {
            common: sync_settings.clone(),
            data: PushPayload { batch },
        };

        let result = Client::new().post(url.clone()).json(&request).send().await;

        let error = match response_or_err(result).await {
            Ok(SyncPushResponseV7::Data(data)) => return Ok(data),
            Ok(SyncPushResponseV7::Error(error)) => error.into(),
            Err(error) => error.into(),
        };

        Err(SyncApiErrorV7 {
            url,
            route: route.to_string(),
            source: error,
        })
    }

    pub async fn get_site_status(&self) -> Result<SiteStatusV7, SyncApiErrorV7> {
        let Self { sync_settings, url } = self;

        let route = "site_status";
        let url = url.join(route).unwrap();

        // TODO: can we abstract the common bit?
        let request = SiteStatusRequestV7 {
            common: sync_settings.clone(),
            data: (),
        };

        let result = Client::new().post(url.clone()).json(&request).send().await;

        let error = match response_or_err(result).await {
            Ok(SiteStatusResponseV7::Data(data)) => return Ok(data),
            Ok(SiteStatusResponseV7::Error(error)) => error.into(),
            Err(error) => error.into(),
        };

        Err(SyncApiErrorV7 {
            url,
            route: route.to_string(),
            source: error,
        })
    }

    pub async fn get_site_info(&self) -> Result<SiteInfoV7, SyncApiErrorV7> {
        let Self { sync_settings, url } = self;

        let route = "site_info";
        let url = url.join(route).unwrap();

        // TODO: can we abstract the common bit?
        let request = SiteInfoRequestV7 {
            common: sync_settings.clone(),
            data: (),
        };

        let result = Client::new().post(url.clone()).json(&request).send().await;

        let error = match response_or_err(result).await {
            Ok(SiteInfoResponseV7::Data(data)) => return Ok(data),
            Ok(SiteInfoResponseV7::Error(error)) => error.into(),
            Err(error) => error.into(),
        };

        Err(SyncApiErrorV7 {
            url,
            route: route.to_string(),
            source: error,
        })
    }
}
