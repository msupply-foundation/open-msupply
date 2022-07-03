use crate::sync::SyncCredentials;

use anyhow::Context;
use log::info;
use reqwest::{
    header::{HeaderMap, HeaderName},
    Client, RequestBuilder, Response, Url,
};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::json;

pub type SyncConnectionError = anyhow::Error;

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum RemoteSyncActionV5 {
    #[serde(alias = "insert")]
    Create,
    #[serde(alias = "update")]
    Update,
    #[serde(alias = "delete")]
    Delete,
    #[serde(alias = "merge")]
    Merge,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RemoteSyncRecordV5 {
    #[serde(rename = "syncOutId")]
    pub sync_id: String,
    #[serde(rename = "tableName")]
    pub table: String,
    #[serde(rename = "recordId")]
    pub record_id: String,
    pub action: RemoteSyncActionV5,
    /// Not set when record is deleted
    #[serde(rename = "recordData")]
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RemoteSyncBatchV5 {
    #[serde(rename = "queueLength")]
    pub queue_length: u32,
    #[serde(default)]
    pub data: Vec<RemoteSyncRecordV5>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RemoteSyncAckV5 {
    #[serde(rename = "syncIDs")]
    pub sync_ids: Vec<String>,
}

#[derive(Clone, Deserialize, Serialize, Debug)]

pub struct CentralSyncRecordV5 {
    #[serde(rename = "ID")]
    pub id: u32,
    #[serde(rename = "tableName")]
    pub table_name: String,
    #[serde(rename = "recordId")]
    pub record_id: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CentralSyncBatchV5 {
    #[serde(rename = "maxCursor")]
    pub max_cursor: u32,
    #[serde(default)]
    pub data: Vec<CentralSyncRecordV5>,
}

#[derive(Debug, Clone)]
pub struct SyncApiV5 {
    server_url: Url,
    credentials: SyncCredentials,
    client: Client,
    headers: HeaderMap,
}

fn generate_headers(hardware_id: &str) -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(
        HeaderName::from_static("msupply-site-uuid"),
        format!("{}", hardware_id).parse().unwrap(),
    );
    headers.insert(
        HeaderName::from_static("app-version"),
        "1.0".parse().unwrap(),
    );
    headers.insert(
        HeaderName::from_static("app-name"),
        "remote_server".parse().unwrap(),
    );
    headers
}

async fn check_status(response: Response) -> anyhow::Result<Response> {
    if !response.status().is_success() {
        let err = response.text().await?;
        return Err(anyhow::Error::msg(err));
    }
    Ok(response)
}

async fn to_json<T: DeserializeOwned>(response: Response) -> anyhow::Result<T> {
    // TODO not owned
    let response_text = response.text().await?;
    let result = serde_json::from_str(&response_text)
        .with_context(|| format!("response: {:?}", response_text))?;
    Ok(result)
}

impl SyncApiV5 {
    pub(crate) fn new(
        server_url: Url,
        credentials: SyncCredentials,
        client: Client,
        hardware_id: &str,
    ) -> SyncApiV5 {
        SyncApiV5 {
            server_url,
            credentials,
            client,
            headers: generate_headers(&hardware_id),
        }
    }

    pub(crate) fn create_post<T>(
        &self,
        route: &str,
        body: &T,
    ) -> Result<RequestBuilder, SyncConnectionError>
    where
        T: Serialize,
    {
        let url = self.server_url.join(route)?;
        let result = self
            .client
            .post(url)
            .basic_auth(
                &self.credentials.username,
                Some(&self.credentials.password_sha256),
            )
            .headers(self.headers.clone())
            .body(serde_json::to_string(&body).unwrap());

        Ok(result)
    }

    pub(crate) fn create_get<T>(
        &self,
        route: &str,
        query: &T,
    ) -> Result<RequestBuilder, SyncConnectionError>
    where
        T: Serialize + ?Sized,
    {
        let url = self.server_url.join(route)?;
        let result = self
            .client
            .get(url)
            .basic_auth(
                &self.credentials.username,
                Some(&self.credentials.password_sha256),
            )
            .headers(self.headers.clone())
            .query(query);

        Ok(result)
    }

    // Initialize remote sync queue.
    // Should only be called on initial sync or when re-initializing an existing data file.
    pub(crate) async fn post_initialise(&self) -> Result<RemoteSyncBatchV5, SyncConnectionError> {
        let response = self
            .create_post("/sync/v5/initialise", &json!({}))?
            .send()
            .await?;

        let response = check_status(response).await?;

        Ok(to_json(response).await?)
    }

    // Get batch of records from remote sync queue.
    pub(crate) async fn get_queued_records(
        &self,
        batch_size: u32,
    ) -> Result<RemoteSyncBatchV5, SyncConnectionError> {
        let query = [("limit", &batch_size.to_string())];
        let response = self
            .create_get("/sync/v5/queued_records", &query)?
            .send()
            .await?;

        let response = check_status(response).await?;
        Ok(to_json(response).await?)
    }

    // Acknowledge successful integration of records from sync queue.
    pub(crate) async fn post_acknowledge_records(
        &self,
        sync_ids: Vec<String>,
    ) -> Result<(), SyncConnectionError> {
        info!("Acknowledging {} records", sync_ids.len());

        let response = self
            .create_post(
                "/sync/v5/acknowledged_records",
                &RemoteSyncAckV5 { sync_ids },
            )?
            .send()
            .await?;

        check_status(response).await?;

        Ok(())
    }

    // Pull batch of records from central sync log.
    pub(crate) async fn get_central_records(
        &self,
        cursor: u32,
        limit: u32,
    ) -> Result<CentralSyncBatchV5, SyncConnectionError> {
        // TODO: add constants for query parameters.
        let query = [
            ("cursor", &cursor.to_string()),
            ("limit", &limit.to_string()),
        ];
        let response = self
            .create_get("/sync/v5/central_records", &query)?
            .send()
            .await?;

        let response = check_status(response).await?;
        Ok(to_json(response).await?)
    }
}

#[cfg(test)]
mod tests {
    use httpmock::{
        Method::{GET, POST},
        MockServer,
    };
    use reqwest::{header::AUTHORIZATION, Client, Url};
    use serde_json::{self, json};

    use crate::sync::{
        sync_api_v5::{
            CentralSyncBatchV5, CentralSyncRecordV5, RemoteSyncAckV5, RemoteSyncActionV5,
            RemoteSyncBatchV5, RemoteSyncRecordV5,
        },
        SyncApiV5, SyncCredentials,
    };

    fn create_api(url: &str, username: &str, password: &str) -> SyncApiV5 {
        let url = Url::parse(url).unwrap();
        let credentials = SyncCredentials::from_plain(username, password);
        let client = Client::new();
        SyncApiV5::new(url, credentials, client, "hardware_id")
    }

    #[actix_rt::test]
    async fn test_initialise_remote_records() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock_authorisation_header =
	    "Basic dXNlcm5hbWU6NWU4ODQ4OThkYTI4MDQ3MTUxZDBlNTZmOGRjNjI5Mjc3MzYwM2QwZDZhYWJiZGQ2MmExMWVmNzIxZDE1NDJkOA=="
	    .to_owned();

        let initialise_path = "/sync/v5/initialise".to_owned();

        let mock_initialise_body = RemoteSyncBatchV5 {
            queue_length: 0,
            data: Vec::new(),
        };

        mock_server.mock(|when, then| {
            when.method(POST)
                .header(AUTHORIZATION.to_string(), mock_authorisation_header)
                .path(initialise_path.clone());
            then.status(200)
                .body(serde_json::to_string(&mock_initialise_body).unwrap());
        });

        mock_server.mock(|when, then| {
            when.method(POST).path(initialise_path.clone());
            then.status(401);
        });

        let sync_connection_with_auth = create_api(&url, "username", "password");
        let initialise_result_with_auth = sync_connection_with_auth.post_initialise().await;

        assert!(initialise_result_with_auth.is_ok());
        assert_eq!(
            serde_json::to_string(&initialise_result_with_auth.unwrap()).unwrap(),
            serde_json::to_string(&mock_initialise_body).unwrap()
        );

        let sync_connection_without_auth = create_api(&url, "", "");
        let initialise_result_without_auth = sync_connection_without_auth.post_initialise().await;

        assert!(initialise_result_without_auth.is_err());
    }

    #[actix_rt::test]
    async fn test_pull_remote_records() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock_authorization_header =
	    "Basic dXNlcm5hbWU6NWU4ODQ4OThkYTI4MDQ3MTUxZDBlNTZmOGRjNjI5Mjc3MzYwM2QwZDZhYWJiZGQ2MmExMWVmNzIxZDE1NDJkOA=="
	    .to_owned();

        let pull_remote_records_path = "/sync/v5/queued_records".to_owned();

        let mock_remote_records_data = vec![
            RemoteSyncRecordV5 {
                sync_id: "sync_record_a".to_owned(),
                table: "table".to_owned(),
                record_id: "record id".to_owned(),
                action: RemoteSyncActionV5::Update,
                data: Some(json!({
                    "id": "record_a"
                })),
            },
            RemoteSyncRecordV5 {
                sync_id: "sync_record_b".to_owned(),
                table: "table".to_owned(),
                record_id: "record id".to_owned(),
                action: RemoteSyncActionV5::Create,
                data: Some(json!({
                    "id": "record_b"
                })),
            },
        ];

        let mock_remote_records_count = mock_remote_records_data.len() as u32;

        let mock_remote_records_body = RemoteSyncBatchV5 {
            queue_length: mock_remote_records_count,
            data: mock_remote_records_data,
        };

        mock_server.mock(|when, then| {
            when.method(GET)
                .header(AUTHORIZATION.to_string(), mock_authorization_header)
                .path(pull_remote_records_path.clone());
            then.status(200)
                .body(serde_json::to_string(&mock_remote_records_body).unwrap());
        });

        mock_server.mock(|when, then| {
            when.method(GET).path(pull_remote_records_path);
            then.status(401);
        });

        let sync_connection_with_auth = create_api(&url, "username", "password");
        let pull_result_with_auth = sync_connection_with_auth.get_queued_records(500).await;

        assert!(pull_result_with_auth.is_ok());
        assert_eq!(
            serde_json::to_string(&pull_result_with_auth.unwrap()).unwrap(),
            serde_json::to_string(&mock_remote_records_body).unwrap()
        );

        let sync_connection_without_auth = create_api(&url, "", "");
        let pull_result_without_auth = sync_connection_without_auth.get_queued_records(500).await;

        assert!(pull_result_without_auth.is_err());
    }

    #[actix_rt::test]
    async fn test_acknowledge_remote_records() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock_authorization_header =
	    "Basic dXNlcm5hbWU6NWU4ODQ4OThkYTI4MDQ3MTUxZDBlNTZmOGRjNjI5Mjc3MzYwM2QwZDZhYWJiZGQ2MmExMWVmNzIxZDE1NDJkOA=="
	    .to_owned();

        let acknowledge_records_path = "/sync/v5/acknowledged_records".to_owned();

        let mock_acknowledge_records_body = RemoteSyncAckV5 {
            sync_ids: vec!["sync_record_a".to_owned(), "sync_record_b".to_owned()],
        };

        mock_server.mock(|when, then| {
            when.method(POST)
                .header(AUTHORIZATION.to_string(), mock_authorization_header)
                .path(acknowledge_records_path.clone());
            then.status(200)
                .body(serde_json::to_string(&mock_acknowledge_records_body).unwrap());
        });

        mock_server.mock(|when, then| {
            when.method(POST).path(acknowledge_records_path.clone());
            then.status(401);
        });

        let sync_connection_with_auth = create_api(&url, "username", "password");
        let acknowledge_result_with_auth = sync_connection_with_auth
            .post_acknowledge_records(mock_acknowledge_records_body.sync_ids.clone())
            .await;

        assert!(acknowledge_result_with_auth.is_ok());

        let sync_connection_without_auth = create_api(&url, "", "");
        let acknowledge_result_without_auth = sync_connection_without_auth
            .post_acknowledge_records(mock_acknowledge_records_body.sync_ids.clone())
            .await;

        assert!(acknowledge_result_without_auth.is_err());
    }

    #[actix_rt::test]
    async fn test_pull_central_records() {
        let mock_server = MockServer::start();
        let url = mock_server.base_url();

        let mock_authorization_header =
	    "Basic dXNlcm5hbWU6NWU4ODQ4OThkYTI4MDQ3MTUxZDBlNTZmOGRjNjI5Mjc3MzYwM2QwZDZhYWJiZGQ2MmExMWVmNzIxZDE1NDJkOA=="
	    .to_owned();

        let pull_central_records_path = "/sync/v5/central_records".to_owned();
        let mock_central_records_data = vec![
            CentralSyncRecordV5 {
                id: 1,
                table_name: "item".to_string(),
                record_id: "item_a".to_string(),
                data: json!({ "id": "item_a" }),
            },
            CentralSyncRecordV5 {
                id: 2,
                table_name: "item".to_string(),
                record_id: "item_b".to_string(),
                data: json!({ "id": "item_b" }),
            },
        ];

        let mock_central_records_body = CentralSyncBatchV5 {
            max_cursor: 2,
            data: mock_central_records_data,
        };

        mock_server.mock(|when, then| {
            when.method(GET)
                .header(AUTHORIZATION.to_string(), mock_authorization_header)
                .path(pull_central_records_path.clone());
            then.status(200)
                .body(serde_json::to_string(&mock_central_records_body).unwrap());
        });

        mock_server.mock(|when, then| {
            when.method(GET).path(pull_central_records_path.clone());
            then.status(401);
        });

        let sync_connection_with_auth = create_api(&url, "username", "password");
        let pull_central_records_result_with_auth =
            sync_connection_with_auth.get_central_records(0, 2).await;

        assert!(pull_central_records_result_with_auth.is_ok());

        let sync_connection_without_auth = create_api(&url, "", "");
        let pull_central_records_result_without_auth =
            sync_connection_without_auth.get_central_records(0, 2).await;

        assert!(pull_central_records_result_without_auth.is_err());
    }
}
