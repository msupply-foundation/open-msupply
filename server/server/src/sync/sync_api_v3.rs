#![allow(dead_code)]

use reqwest::{
    header::{HeaderMap, ACCEPT, CONTENT_LENGTH},
    Client, Url,
};
use serde::{Deserialize, Serialize};

use super::SyncCredentials;

pub struct SyncApiV3 {
    server_url: Url,
    extra_headers: HeaderMap,
    client: Client,
    credentials: SyncCredentials,
}

fn extra_headers(side_id: &str) -> anyhow::Result<HeaderMap> {
    let mut headers = HeaderMap::new();
    headers.insert("msupply-site-uuid", side_id.parse()?);
    headers.insert(CONTENT_LENGTH, "application/json".parse()?);
    headers.insert(ACCEPT, "application/json".parse()?);
    Ok(headers)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RemoteSyncRecordV3 {
    #[serde(rename = "RecordType")]
    pub record_type: String,
    #[serde(rename = "SyncID")]
    pub sync_id: String,
    #[serde(rename = "KeyFieldID")]
    pub key_field_id: i64,
    #[serde(rename = "mergeIDtokeep")]
    pub merge_id_tokeep: String,
    #[serde(rename = "StoreID")]
    pub store_id: String,
    #[serde(rename = "RecordID")]
    pub record_id: String,
    #[serde(rename = "SyncType")]
    pub sync_type: String, // e.g. "U"
    #[serde(rename = "mergeIDtodelete")]
    pub merge_id_todelete: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct RemoteSyncAckV3 {
    #[serde(rename = "SyncRecordIDs")]
    sync_record_ids: Vec<String>,
}

impl SyncApiV3 {
    pub fn new(
        server_url: Url,
        credentials: SyncCredentials,
        client: Client,
        site_id: &str,
    ) -> anyhow::Result<Self> {
        Ok(SyncApiV3 {
            server_url,
            extra_headers: extra_headers(site_id)?,
            client,
            credentials,
        })
    }

    pub async fn get_initial_dump(
        &self,
        from_site: &str,
        to_site: &str,
    ) -> anyhow::Result<serde_json::Value> {
        let query = [
            ("from_site", &from_site.to_string()),
            ("to_site", &to_site.to_string()),
        ];

        let response = self
            .client
            .get(self.server_url.join("/sync/v3/initial_dump")?)
            .basic_auth(
                &self.credentials.username,
                Some(&self.credentials.password_sha256),
            )
            .query(&query)
            .headers(self.extra_headers.clone())
            .send()
            .await?
            .error_for_status()?;

        let response = response.json().await?;
        Ok(response)
    }

    pub async fn get_queued_records(
        &self,
        from_site: &str,
        to_site: &str,
        limit: u32,
    ) -> anyhow::Result<Vec<RemoteSyncRecordV3>> {
        let query = [
            ("from_site", &from_site.to_string()),
            ("to_site", &to_site.to_string()),
            ("limit", &limit.to_string()),
        ];

        let response = self
            .client
            .get(self.server_url.join("/sync/v3/queued_records")?)
            .basic_auth(
                &self.credentials.username,
                Some(&self.credentials.password_sha256),
            )
            .query(&query)
            .headers(self.extra_headers.clone())
            .send()
            .await?
            .error_for_status()?;

        let response = response.json().await?;
        Ok(response)
    }

    pub async fn post_queued_records(
        &self,
        from_site: &str,
        to_site: &str,
        records: &RemoteSyncRecordV3,
    ) -> anyhow::Result<serde_json::Value> {
        let query = [
            ("from_site", &from_site.to_string()),
            ("to_site", &to_site.to_string()),
        ];

        let response = self
            .client
            .post(self.server_url.join("/sync/v3/queued_records")?)
            .basic_auth(
                &self.credentials.username,
                Some(&self.credentials.password_sha256),
            )
            .query(&query)
            .headers(self.extra_headers.clone())
            .json(records)
            .send()
            .await?
            .error_for_status()?;

        let response = response.json().await?;
        Ok(response)
    }

    pub async fn post_acknowledged_records(
        &self,
        from_site: &str,
        to_site: &str,
        records: &RemoteSyncAckV3,
    ) -> anyhow::Result<serde_json::Value> {
        let query = [
            ("from_site", &from_site.to_string()),
            ("to_site", &to_site.to_string()),
        ];

        let response = self
            .client
            .post(self.server_url.join("/sync/v3/acknowledged_records")?)
            .basic_auth(
                &self.credentials.username,
                Some(&self.credentials.password_sha256),
            )
            .query(&query)
            .headers(self.extra_headers.clone())
            .json(records)
            .send()
            .await?
            .error_for_status()?;

        let response = response.json().await?;
        Ok(response)
    }
}
