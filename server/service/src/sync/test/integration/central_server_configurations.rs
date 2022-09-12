use std::env;

use rand::{thread_rng, Rng};
use reqwest::{Client, Url};
use serde_json::json;
use util::{hash::sha256, uuid::uuid};

use crate::sync::{
    api::{SyncApiError, SyncApiV5},
    settings::SyncSettings,
    SyncCredentials,
};

use super::with_retry;

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
}

pub(crate) struct ConfigureCentralServer {
    api: SyncApiV5,
    new_site_password: String,
    server_url: String,
}

pub(crate) struct CreateSyncSiteResult {
    pub(crate) new_site_properties: NewSiteProperties,
    pub(crate) sync_settings: SyncSettings,
}

impl ConfigureCentralServer {
    pub(crate) fn from_env() -> ConfigureCentralServer {
        let password =
            env::var("SYNC_SITE_PASSWORD").expect("SYNC_SITE_PASSWORD env variable missing");
        let new_site_password =
            env::var("NEW_SITE_PASSWORD").expect("NEW_SITE_PASSWORD env variable missing");
        let site_name = env::var("SYNC_SITE_NAME").expect("SYNC_SITE_NAME env variable missing");
        let url = env::var("SYNC_URL").expect("SYNC_URL env variable missing");

        ConfigureCentralServer {
            api: SyncApiV5::new(
                Url::parse(&url).unwrap(),
                SyncCredentials {
                    username: site_name,
                    password_sha256: sha256(&password),
                },
                Client::new(),
                "",
            ),
            server_url: url,
            new_site_password,
        }
    }

    pub(crate) async fn upsert_records(&self, records: serde_json::Value) -> anyhow::Result<()> {
        Ok(with_retry(|| self.api.upsert_central_records(&records)).await?)
    }

    pub(crate) async fn delete_records(&self, records: serde_json::Value) -> anyhow::Result<()> {
        Ok(with_retry(|| self.api.delete_central_records(&records)).await?)
    }

    pub(crate) async fn create_sync_site(&self) -> anyhow::Result<CreateSyncSiteResult> {
        let new_site_properties = NewSiteProperties::new(&self.new_site_password);

        self.api
            .upsert_central_records(&new_site_properties.site_data())
            .await?;

        Ok(CreateSyncSiteResult {
            sync_settings: SyncSettings {
                url: self.server_url.clone(),
                username: new_site_properties.site_id_as_string(),
                password_sha256: new_site_properties.password_sha256.clone(),
                interval_sec: 10000000,
            },
            new_site_properties,
        })
    }
}

pub(crate) struct NewSiteProperties {
    pub(crate) store_id: String,
    pub(crate) name_id: String,
    pub(crate) site_uuid: String,
    pub(crate) site_id: i32,
    password_sha256: String,
}

impl NewSiteProperties {
    fn new(password: &str) -> NewSiteProperties {
        NewSiteProperties {
            store_id: uuid(),
            name_id: uuid(),
            // TODO max that can be used ?
            site_id: thread_rng().gen::<i32>(),
            site_uuid: uuid(),
            password_sha256: sha256(password),
        }
    }
    fn site_id_as_string(&self) -> String {
        format!("{}", self.site_id)
    }

    // Data for creating site was deduced by doing diff of central data by running below code before and after creating store and site
    // re-saving export each time for clean diff and doing a temp commit (or can save to multiple files and do --no-index git diff)
    //
    // var $content : Text
    // For each ($tableName; ds)
    // $recordInTable:=ds[$tableName].all()
    // For each ($record; $recordInTable)
    //     $content:=$content+$tableName+JSON Stringify($record.toObject(); *)
    // End for each
    // End for each
    // $file:=File("/Users/Drei/Documents/repos/work/msupply/out.txt")
    // $file.create()
    // $file.setText($content; Document with CR)
    fn site_data(&self) -> serde_json::Value {
        json!(
        {
            "name": [
                {
                    "ID": self.name_id,
                    "name": self.name_id
                }
            ],
            "site": [
                {
                    "ID":  self.site_uuid,
                    "site_ID": self.site_id,
                    "name":  self.site_id_as_string(),
                    "password":  self.password_sha256,
                    "code": self.site_id_as_string()
                }
            ],
            "store": [
                {
                    "ID":  self.store_id,
                    "name":  self.store_id,
                    "code":  self.store_id,
                    "name_ID":  self.name_id,
                    "sync_id_remote_site":  self.site_id,
                    "store_mode": "store"
                }
            ]
        })
    }
}
