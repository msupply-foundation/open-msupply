use std::error::Error;

use ::serde::Deserialize;
use async_trait::async_trait;
use repository::{KeyValueStoreRepository, KeyValueType, RepositoryError, StorageConnection};
use reqwest::{Client, Url};

use crate::{
    service_provider::ServiceProvider,
    sync::{
        api::SyncApiV5, remote_data_synchroniser::RemoteDataSynchroniser, settings::SyncSettings,
        SyncCredentials,
    },
};

pub struct RemoteSync {
    remote: RemoteDataSynchroniser,
}

#[derive(Debug, PartialEq, Deserialize)]
pub struct SiteInfo {
    pub id: String,
    pub site_id: i32,
}

#[async_trait]
pub trait SiteInfoTrait: Sync + Send {
    async fn request_site_info(&self, remote: RemoteSync) -> Result<SiteInfo, Box<dyn Error>>;
    fn set_site_info(
        &self,
        connection: &StorageConnection,
        site_info: SiteInfo,
    ) -> Result<(), RepositoryError>;
    fn get_site_id(
        &self,
        service_provider: &ServiceProvider,
    ) -> Result<Option<i32>, RepositoryError>;
}

pub struct SiteInfoService {}

pub fn set_api_info(
    settings: &SyncSettings,
    service_provider: &ServiceProvider,
) -> anyhow::Result<RemoteSync> {
    let client = Client::new();
    let url = Url::parse(&settings.url)?;
    let hardware_id = service_provider.app_data_service.get_hardware_id()?;
    let credentials = SyncCredentials {
        username: settings.username.clone(),
        password_sha256: settings.password_sha256.clone(),
    };
    let sync_api_v5 = SyncApiV5::new(
        url.clone(),
        credentials.clone(),
        client.clone(),
        &hardware_id,
    );
    Ok(RemoteSync {
        remote: RemoteDataSynchroniser {
            sync_api_v5: sync_api_v5.clone(),
        },
    })
}

#[async_trait]
impl SiteInfoTrait for SiteInfoService {
    async fn request_site_info(&self, remote: RemoteSync) -> Result<SiteInfo, Box<(dyn Error)>> {
        let site_info = remote.remote.request_and_set_site_info().await?;
        Ok(SiteInfo {
            id: site_info.id,
            site_id: site_info.site_id,
        })
    }

    fn set_site_info(
        &self,
        connection: &StorageConnection,
        site_info: SiteInfo,
    ) -> Result<(), RepositoryError> {
        let kv_store_repo = KeyValueStoreRepository::new(&connection);
        kv_store_repo.set_string(KeyValueType::SettingsSyncSiteUuid, Some(site_info.id))?;
        kv_store_repo.set_i32(KeyValueType::SettingsSyncSiteId, Some(site_info.site_id))?;
        Ok(())
    }

    fn get_site_id(
        &self,
        service_provider: &ServiceProvider,
    ) -> Result<Option<i32>, RepositoryError> {
        let connection = service_provider.connection()?;
        let site_id =
            KeyValueStoreRepository::new(&connection).get_i32(KeyValueType::SettingsSyncSiteId)?;

        Ok(site_id)
    }
}
