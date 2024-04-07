use serde::{Deserialize, Serialize};
use std::env;

use crate::{
    app_data::{AppDataService, AppDataServiceTrait},
    sync::{
        api::{to_json, SyncApiError, SyncApiSettings, SyncApiV5},
        settings::SyncSettings,
    },
};

use super::with_retry;

#[derive(Deserialize)]
struct SyncSite {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "site_ID")]
    site_id: u32,
    name: String,
    #[serde(rename = "password")]
    password_sha256: String,
}
#[derive(Deserialize)]
struct SyncStore {
    #[serde(rename = "ID")]
    id: String,
    #[serde(rename = "name_ID")]
    name_id: String,
}
#[derive(Deserialize)]
pub(crate) struct CreateSyncSiteResponse {
    site: SyncSite,
    store: SyncStore,
}
#[derive(Serialize)]
pub(crate) struct CreateSyncSiteInput {
    #[serde(rename = "visibleNameIds")]
    visible_name_ids: Vec<String>,
}

impl SyncApiV5 {
    pub(crate) async fn upsert_central_records(
        &self,
        value: &serde_json::Value,
    ) -> Result<(), SyncApiError> {
        self.do_post("/sync/v5/test/upsert", value).await?;

        Ok(())
    }

    pub(crate) async fn delete_central_records(
        &self,
        value: &serde_json::Value,
    ) -> Result<(), SyncApiError> {
        self.do_post("/sync/v5/test/delete", value).await?;

        Ok(())
    }

    pub(crate) async fn create_sync_site(
        &self,
        visible_name_ids: Vec<String>,
    ) -> Result<CreateSyncSiteResponse, SyncApiError> {
        let route = "/sync/v5/test/create_site";

        let response = self
            .do_post(route, &CreateSyncSiteInput { visible_name_ids })
            .await?;

        let site_response = to_json::<CreateSyncSiteResponse>(response)
            .await
            .map_err(|error| self.api_error(route, error.into()))?;

        let check_site_api = SyncApiV5 {
            settings: SyncApiSettings {
                username: site_response.site.name.clone(),
                password_sha256: site_response.site.password_sha256.clone(),
                ..self.settings.clone()
            },
            ..self.clone()
        };

        check_site_api.get_site_info().await?;
        Ok(site_response)
    }
}

pub(crate) struct ConfigureCentralServer {
    api: SyncApiV5,
    server_url: String,
}

#[derive(Debug)]
pub(crate) struct SiteConfiguration {
    pub(crate) new_site_properties: NewSiteProperties,
    pub(crate) sync_settings: SyncSettings,
}

impl ConfigureCentralServer {
    pub(crate) fn from_env() -> ConfigureCentralServer {
        let password =
            env::var("SYNC_SITE_PASSWORD").expect("SYNC_SITE_PASSWORD env variable missing");
        let site_name = env::var("SYNC_SITE_NAME").expect("SYNC_SITE_NAME env variable missing");
        let url = env::var("SYNC_URL").expect("SYNC_URL env variable missing");

        let hardware_id = AppDataService::new("../app_data")
            .get_hardware_id()
            .unwrap();

        ConfigureCentralServer {
            api: SyncApiV5::new_test(&url, &site_name, &password, &hardware_id),
            server_url: url,
        }
    }

    pub(crate) async fn upsert_records(
        &self,
        records: serde_json::Value,
    ) -> Result<(), SyncApiError> {
        Ok(with_retry(|| self.api.upsert_central_records(&records)).await?)
    }

    pub(crate) async fn delete_records(
        &self,
        records: serde_json::Value,
    ) -> Result<(), SyncApiError> {
        Ok(with_retry(|| self.api.delete_central_records(&records)).await?)
    }

    pub(crate) async fn create_sync_site(
        &self,
        visible_name_ids: Vec<String>,
    ) -> anyhow::Result<SiteConfiguration> {
        let result = with_retry(|| self.api.create_sync_site(visible_name_ids.clone())).await?;

        let new_site_properties = NewSiteProperties {
            store_id: result.store.id,
            name_id: result.store.name_id,
            site_id: result.site.site_id as i32,
            site_uuid: result.site.id,
        };

        Ok(SiteConfiguration {
            sync_settings: SyncSettings {
                url: self.server_url.clone(),
                username: result.site.name,
                password_sha256: result.site.password_sha256,
                interval_seconds: 10000000,
                // TODO make this adjustable after initialisation
                // to check cursor is being updated correctly
                // fresh data file has 230 central change logs
                // and a small number makes integration tests super slow
                batch_size: Default::default(),
            },
            new_site_properties,
        })
    }
}

#[derive(Debug)]
pub(crate) struct NewSiteProperties {
    pub(crate) store_id: String,
    pub(crate) name_id: String,
    pub(crate) site_id: i32,
    pub(crate) site_uuid: String,
}
