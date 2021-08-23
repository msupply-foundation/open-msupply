#![allow(where_clauses_object_safety)]

#[cfg(test)]
mod sync {
    use remote_server::util::{
        settings::SyncSettings,
        sync::{
            SyncConnection, SyncQueueAcknowledgement, SyncQueueBatch, SyncQueueRecord,
            SyncQueueRecordAction, SyncQueueRecordData,
        },
    };

    use httpmock::prelude::{MockServer, GET, POST};
    use reqwest::{header::AUTHORIZATION, Url};
    use serde_json;

    #[actix_rt::test]
    async fn initialize_with_valid_credentials_is_success() {
        let mock_server = MockServer::start();
        let mock_server_url = Url::parse(&mock_server.url("")).unwrap();

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
        let mock_initialize_body = SyncQueueBatch {
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

        let initialize_body = sync_connection.initialize().await.unwrap();

        assert_eq!(
            serde_json::to_string(&initialize_body).unwrap(),
            serde_json::to_string(&mock_initialize_body).unwrap()
        );
    }

    #[actix_rt::test]
    async fn queued_records_with_valid_credentials_is_success() {
        let mock_server = MockServer::start();
        let mock_server_url = Url::parse(&mock_server.url("")).unwrap();

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

        let mock_queued_records_path = "/sync/v5/queued_records".to_owned();

        let mock_queued_records_data = vec![
            SyncQueueRecord {
                sync_id: "sync_record_a".to_owned(),
                action: SyncQueueRecordAction::Update,
                data: SyncQueueRecordData {
                    id: "record_a".to_owned(),
                },
            },
            SyncQueueRecord {
                sync_id: "sync_record_b".to_owned(),
                action: SyncQueueRecordAction::Create,
                data: SyncQueueRecordData {
                    id: "record_b".to_owned(),
                },
            },
        ];

        let mock_queued_records_count = mock_queued_records_data.len() as u32;

        let mock_queued_records_body = SyncQueueBatch {
            queue_length: mock_queued_records_count,
            data: Some(mock_queued_records_data),
        };

        mock_server.mock(|when, then| {
            when.method(GET)
                .header(AUTHORIZATION.to_string(), mock_authorization_header)
                .path(mock_queued_records_path);
            then.status(200)
                .body(serde_json::to_string(&mock_queued_records_body).unwrap());
        });

        let sync_connection = SyncConnection::new(&mock_sync_settings);

        let queued_records_body = sync_connection.queued_records().await.unwrap();

        assert_eq!(
            serde_json::to_string(&queued_records_body).unwrap(),
            serde_json::to_string(&mock_queued_records_body).unwrap()
        );
    }

    #[actix_rt::test]
    async fn acknowledge_records_with_valid_credentials_is_success() {
        let mock_server = MockServer::start();
        let mock_server_url = Url::parse(&mock_server.url("")).unwrap();

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
            SyncQueueRecord {
                sync_id: "sync_record_a".to_owned(),
                action: SyncQueueRecordAction::Update,
                data: SyncQueueRecordData {
                    id: "record_a".to_owned(),
                },
            },
            SyncQueueRecord {
                sync_id: "sync_record_b".to_owned(),
                action: SyncQueueRecordAction::Create,
                data: SyncQueueRecordData {
                    id: "record_b".to_owned(),
                },
            },
        ];

        let mock_acknowledge_records_body = SyncQueueAcknowledgement {
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
            .acknowledge_records(&mock_acknowledge_records_data)
            .await
            .unwrap();

        mock_acknowledge_records.assert();
    }
}
