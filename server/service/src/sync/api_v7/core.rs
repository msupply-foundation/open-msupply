use reqwest::Client;
use thiserror::Error;
use url::ParseError;

use super::*;

#[derive(Debug, Clone)]
pub(crate) struct SyncApiV7 {
    pub(crate) url: Url,
    pub(crate) sync_v7_settings: SyncV7Settings,
}

#[derive(Error, Debug)]
pub enum SyncApiV7CreatingError {
    #[error("Cannot parse url while creating SyncApiV7 instance, url: '{0}'")]
    CannotParseSyncUrl(String, #[source] ParseError),
    #[error("Error while creating SyncApiV7 instance")]
    Other(#[source] anyhow::Error),
}

impl SyncApiV7 {
    pub fn new(
        url: &str,
        sync_v7_settings: &SyncV7Settings,
    ) -> Result<Self, SyncApiV7CreatingError> {
        let mut url = Url::parse(url)
            .map_err(|error| SyncApiV7CreatingError::CannotParseSyncUrl(url.to_string(), error))?;

        url = url.join("central/sync/").unwrap();

        Ok(Self {
            url,
            sync_v7_settings: sync_v7_settings.clone(),
        })
    }

    pub async fn pull(
        &self,
        cursor: u64,
        batch_size: u32,
        is_initialised: bool,
    ) -> Result<SyncBatchV7, SyncApiErrorV7> {
        let Self {
            sync_v7_settings,
            url,
        } = self;

        let route = "pull";
        let url = url.join(route).unwrap();

        // TODO: can we abstract the common bit?
        let request = SyncPullRequestV7 {
            common: sync_v7_settings.clone(),
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
        let Self {
            sync_v7_settings,
            url,
        } = self;

        let route = "push";
        let url = url.join(route).unwrap();

        // TODO: can we abstract the common bit?
        let request = SyncPushRequestV7 {
            common: sync_v7_settings.clone(),
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
        let Self {
            sync_v7_settings,
            url,
        } = self;

        let route = "site_status";
        let url = url.join(route).unwrap();

        // TODO: can we abstract the common bit?
        let request = SiteStatusRequestV7 {
            common: sync_v7_settings.clone(),
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
}
