use crate::util::{
    settings::SyncSettings,
    sync::{
        CentralSyncBatch, RemoteSyncAcknowledgement, RemoteSyncBatch, RemoteSyncRecord,
        SyncCredentials, SyncServer,
    },
};

use reqwest::{
    header::{HeaderMap, CONTENT_LENGTH},
    Client,
};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SyncConnectionError {
    #[error("Failed to connect to sync server")]
    ConnectError { source: reqwest::Error },
    #[error("Timed out while attempting to connect to sync server")]
    TimedoutError { source: reqwest::Error },
    #[error("Sync server responded with status 400 Bad Request")]
    BadRequestError { source: reqwest::Error },
    #[error("Sync server responded with status 401 Unauthorized")]
    UnauthorisedError { source: reqwest::Error },
    #[error("Sync server responded with status 404 Not found")]
    NotFoundError { source: reqwest::Error },
    #[error("Sync server responded with status 405 Method Not Allowed")]
    MethodNotAllowedError { source: reqwest::Error },
    #[error("Sync server responded with status 500 Internal Server Error")]
    InternalServerError { source: reqwest::Error },
    #[error("Unknown sync connection error")]
    UnknownError { source: reqwest::Error },
}

impl From<reqwest::Error> for SyncConnectionError {
    fn from(error: reqwest::Error) -> Self {
        if error.is_connect() {
            SyncConnectionError::ConnectError { source: error }
        } else if error.is_timeout() {
            SyncConnectionError::TimedoutError { source: error }
        } else if error.is_status() {
            let status_code = error.status().unwrap();
            match status_code {
                reqwest::StatusCode::BAD_REQUEST => {
                    SyncConnectionError::BadRequestError { source: error }
                }
                reqwest::StatusCode::UNAUTHORIZED => {
                    SyncConnectionError::UnauthorisedError { source: error }
                }
                reqwest::StatusCode::NOT_FOUND => {
                    SyncConnectionError::NotFoundError { source: error }
                }
                reqwest::StatusCode::METHOD_NOT_ALLOWED => {
                    SyncConnectionError::MethodNotAllowedError { source: error }
                }
                reqwest::StatusCode::INTERNAL_SERVER_ERROR => {
                    SyncConnectionError::InternalServerError { source: error }
                }
                _ => SyncConnectionError::UnknownError { source: error },
            }
        } else {
            SyncConnectionError::UnknownError { source: error }
        }
    }
}

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
    pub async fn initialise_remote_records(&self) -> Result<RemoteSyncBatch, SyncConnectionError> {
        let url = self.server.initialise_url();

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

    // Get batch of records from remote sync queue.
    pub async fn pull_remote_records(&self) -> Result<RemoteSyncBatch, SyncConnectionError> {
        // Arbitrary batch size.
        const BATCH_SIZE: u32 = 500;

        let url = self.server.queued_records_url();
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

    // Acknowledge successful integration of records from sync queue.
    pub async fn acknowledge_remote_records(
        &self,
        records: &Vec<RemoteSyncRecord>,
    ) -> Result<(), SyncConnectionError> {
        // TODO: add error handling.
        let url = self.server.acknowledge_records_url();

        let body: RemoteSyncAcknowledgement = RemoteSyncAcknowledgement {
            sync_ids: records
                .into_iter()
                .map(|record| record.sync_id.clone())
                .collect(),
        };

        self.client
            .post(url)
            .basic_auth(&self.credentials.username, Some(&self.credentials.password))
            .body(serde_json::to_string(&body).unwrap_or_default())
            .send()
            .await?;

        Ok(())
    }

    // Pull batch of records from central sync log.
    pub async fn pull_central_records(
        &self,
        cursor: u32,
        limit: u32,
    ) -> Result<CentralSyncBatch, SyncConnectionError> {
        let url = self.server.central_records_url();

        // TODO: add constants for query parameters.
        let query = [
            ("cursor", &cursor.to_string()),
            ("limit", &limit.to_string()),
        ];

        // Server rejects initialization request if no `content-length` header is included.
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_LENGTH, "0".parse().unwrap());

        let response = self
            .client
            .get(url)
            .basic_auth(&self.credentials.username, Some(&self.credentials.password))
            .query(&query)
            .headers(headers)
            .send()
            .await?;

        let sync_batch = response.json::<CentralSyncBatch>().await?;

        Ok(sync_batch)
    }
}

#[cfg(test)]
mod tests {
    use httpmock::prelude::{MockServer, GET, POST};
    use reqwest::header::AUTHORIZATION;
    use serde_json;

    use crate::util::{
        settings::SyncSettings,
        sync::{
            RemoteSyncAcknowledgement, RemoteSyncBatch, RemoteSyncRecord, RemoteSyncRecordAction,
            RemoteSyncRecordData, SyncConnection, SyncConnectionError,
        },
    };

    #[actix_rt::test]
    async fn initialise_remote_records_with_valid_credentials_is_success() {
        let mock_server = MockServer::start();

        let mock_username = "username".to_owned();
        let mock_password = "password".to_owned();

        let mock_sync_settings = SyncSettings {
            host: mock_server.host().clone(),
            port: mock_server.port().clone(),
            username: mock_username.clone(),
            password: mock_password.clone(),
            interval: 0,
        };

        let mock_authorization_header =
	    "Basic dXNlcm5hbWU6NWU4ODQ4OThkYTI4MDQ3MTUxZDBlNTZmOGRjNjI5Mjc3MzYwM2QwZDZhYWJiZGQ2MmExMWVmNzIxZDE1NDJkOA=="
	    .to_owned();

        let mock_initialize_path = "/sync/v5/initialise".to_owned();
        let mock_initialize_body = RemoteSyncBatch {
            queue_length: 0,
            data: None,
        };

        mock_server.mock(|when, then| {
            when.method(POST)
                .header(AUTHORIZATION.to_string(), mock_authorization_header)
                .path(mock_initialize_path);
            then.status(200)
                .body(serde_json::to_string(&mock_initialize_body).unwrap());
        });

        let sync_connection = SyncConnection::new(&mock_sync_settings);

        let initialize_body = sync_connection.initialise_remote_records().await.unwrap();

        assert_eq!(
            serde_json::to_string(&initialize_body).unwrap(),
            serde_json::to_string(&mock_initialize_body).unwrap()
        );
    }

    #[actix_rt::test]
    async fn queued_records_with_valid_credentials_is_success() {
        let mock_server = MockServer::start();

        let mock_username = "username".to_owned();
        let mock_password = "password".to_owned();

        let mock_sync_settings = SyncSettings {
            host: mock_server.host().clone(),
            port: mock_server.port().clone(),
            username: mock_username.clone(),
            password: mock_password.clone(),
            interval: 0,
        };

        let mock_authorization_header =
	    "Basic dXNlcm5hbWU6NWU4ODQ4OThkYTI4MDQ3MTUxZDBlNTZmOGRjNjI5Mjc3MzYwM2QwZDZhYWJiZGQ2MmExMWVmNzIxZDE1NDJkOA=="
	    .to_owned();

        let mock_remote_records_path = "/sync/v5/queued_records".to_owned();

        let mock_remote_records_data = vec![
            RemoteSyncRecord {
                sync_id: "sync_record_a".to_owned(),
                action: RemoteSyncRecordAction::Update,
                data: RemoteSyncRecordData {
                    id: "record_a".to_owned(),
                },
            },
            RemoteSyncRecord {
                sync_id: "sync_record_b".to_owned(),
                action: RemoteSyncRecordAction::Create,
                data: RemoteSyncRecordData {
                    id: "record_b".to_owned(),
                },
            },
        ];

        let mock_remote_records_count = mock_remote_records_data.len() as u32;

        let mock_remote_records_body = RemoteSyncBatch {
            queue_length: mock_remote_records_count,
            data: Some(mock_remote_records_data),
        };

        mock_server.mock(|when, then| {
            when.method(GET)
                .header(AUTHORIZATION.to_string(), mock_authorization_header)
                .path(mock_remote_records_path);
            then.status(200)
                .body(serde_json::to_string(&mock_remote_records_body).unwrap());
        });

        let sync_connection = SyncConnection::new(&mock_sync_settings);

        let remote_records_body = sync_connection.pull_remote_records().await.unwrap();

        assert_eq!(
            serde_json::to_string(&remote_records_body).unwrap(),
            serde_json::to_string(&mock_remote_records_body).unwrap()
        );
    }

    #[actix_rt::test]
    async fn acknowledge_records_with_valid_credentials_is_success() {
        let mock_server = MockServer::start();

        let mock_username = "username".to_owned();
        let mock_password = "password".to_owned();

        let mock_sync_settings = SyncSettings {
            host: mock_server.host().clone(),
            port: mock_server.port().clone(),
            username: mock_username.clone(),
            password: mock_password.clone(),
            interval: 0,
        };

        let mock_authorization_header =
	    "Basic dXNlcm5hbWU6NWU4ODQ4OThkYTI4MDQ3MTUxZDBlNTZmOGRjNjI5Mjc3MzYwM2QwZDZhYWJiZGQ2MmExMWVmNzIxZDE1NDJkOA=="
	    .to_owned();

        let mock_acknowledge_records_path = "/sync/v5/acknowledged_records".to_owned();

        let mock_acknowledge_records_data = vec![
            RemoteSyncRecord {
                sync_id: "sync_record_a".to_owned(),
                action: RemoteSyncRecordAction::Update,
                data: RemoteSyncRecordData {
                    id: "record_a".to_owned(),
                },
            },
            RemoteSyncRecord {
                sync_id: "sync_record_b".to_owned(),
                action: RemoteSyncRecordAction::Create,
                data: RemoteSyncRecordData {
                    id: "record_b".to_owned(),
                },
            },
        ];

        let mock_acknowledge_records_body = RemoteSyncAcknowledgement {
            sync_ids: vec!["sync_record_a".to_owned(), "sync_record_b".to_owned()],
        };

        let mock_acknowledge_records = mock_server.mock(|when, then| {
            when.method(POST)
                .header(AUTHORIZATION.to_string(), mock_authorization_header)
                .path(mock_acknowledge_records_path);
            then.status(200)
                .body(serde_json::to_string(&mock_acknowledge_records_body).unwrap());
        });

        let sync_connection = SyncConnection::new(&mock_sync_settings);

        sync_connection
            .acknowledge_remote_records(&mock_acknowledge_records_data)
            .await
            .unwrap();

        mock_acknowledge_records.assert();
    }
}
