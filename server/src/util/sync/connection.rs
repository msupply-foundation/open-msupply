use crate::util::{
    settings::SyncSettings,
    sync::{
        RemoteSyncAcknowledgement, RemoteSyncBatch, RemoteSyncRecord, SyncCredentials, SyncServer,
    },
};

use reqwest::{
    header::{HeaderMap, CONTENT_LENGTH},
    Client,
};

pub struct SyncConnection {
    client: Client,
    server: SyncServer,
    credentials: SyncCredentials,
}

impl SyncConnection {
    pub fn new(settings: &SyncSettings) -> SyncConnection {
        let host = settings.host.clone();
        let port = settings.port.clone();
        let username = &settings.username;
        let password = &settings.password;

        let client = Client::new();
        let server = SyncServer::new(host, port);
        let credentials = SyncCredentials::new(username, password);

        SyncConnection {
            client,
            server,
            credentials,
        }
    }

    // Initialize remote sync queue.
    //
    // Should only be called on initial sync or when re-initializing an existing data file.
    //
    // TODO: add custom error to return type.
    pub async fn initialize(&self) -> Result<RemoteSyncBatch, reqwest::Error> {
        // TODO: add error handling.
        let url = self.server.initialize_url();

        // Server rejects initialization request if no `content-length` header included.
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_LENGTH, "0".parse().unwrap());

        let request = self
            .client
            .post(url)
            .basic_auth(&self.credentials.username, Some(&self.credentials.password))
            .headers(headers);

        let response = request.send().await?;

        let sync_batch = response.json::<RemoteSyncBatch>().await?;

        Ok(sync_batch)
    }

    // Pull batch of records from remote sync queue.
    //
    // TODO: add custom error to return type.
    pub async fn remote_records(&self) -> Result<RemoteSyncBatch, reqwest::Error> {
        // Arbitrary batch size.
        const BATCH_SIZE: u32 = 500;

        let url = self.server.queued_records_url();
        // TODO: add constants for query parameters.
        let query = [("limit", &BATCH_SIZE.to_string())];

        // Server rejects initialization request if no `content-length` header is included.
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_LENGTH, "0".parse().unwrap());

        let request = self
            .client
            .get(url)
            .basic_auth(&self.credentials.username, Some(&self.credentials.password))
            .query(&query)
            .headers(headers);

        let response = request.send().await?;

        let sync_batch = response.json::<RemoteSyncBatch>().await?;

        Ok(sync_batch)
    }

        Ok(sync_batch)
    }

    // Acknowledge successful integration of records from sync queue.
    //
    // TODO: add return type.
    pub async fn acknowledge_records(
        &self,
        records: &Vec<RemoteSyncRecord>,
    ) -> Result<(), reqwest::Error> {
        // TODO: add error handling.
        let url = self.server.acknowledge_records_url();

        let body: RemoteSyncAcknowledgement = RemoteSyncAcknowledgement {
            sync_ids: records
                .into_iter()
                .map(|record| record.sync_id.clone())
                .collect(),
        };

        let request = self
            .client
            .post(url)
            .basic_auth(&self.credentials.username, Some(&self.credentials.password))
            .body(serde_json::to_string(&body).unwrap_or_default());

        request.send().await?;

        Ok(())
    }
}
