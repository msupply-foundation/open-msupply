use crate::{
    service_provider::ServiceProvider,
    sync_v7::{
        api::{patient_data_for_site, SyncApiV7},
        validate_translate_integrate::{validate_translate_integrate_in_memory, SyncContext},
    },
};
use chrono::Utc;
use repository::{
    syncv7::SyncError, RowActionType, SyncAction, SyncBufferRow, SyncRecordData, SyncVersion,
};

pub async fn pull_and_integrate_patient_data(
    service_provider: &ServiceProvider,
    patient_id: &str,
    store_id: &str,
    name_store_join_id: &str,
) -> Result<String, SyncError> {
    let ctx = service_provider
        .basic_context()
        .map_err(|e| SyncError::Other(e.to_string()))?;
    let connection = &ctx.connection;

    let settings = service_provider
        .settings
        .sync_settings(&ctx)?
        .ok_or_else(|| SyncError::Other("Sync settings not configured".to_string()))?;

    let api = SyncApiV7::new(service_provider, &settings.url)?;

    let response = api
        .patient_data_for_site(patient_data_for_site::Input {
            patient_id: patient_id.to_string(),
            store_id: store_id.to_string(),
            name_store_join_id: name_store_join_id.to_string(),
        })
        .await?;

    let nsj_id = response.name_store_join_id;
    let batch = response.batch;
    let source_site_id = batch.site_id;

    let buffer_rows: Vec<SyncBufferRow> = batch
        .records
        .into_iter()
        .map(|record| SyncBufferRow {
            cursor: record.cursor as i32,
            record_id: record.record_id,
            received_datetime: Utc::now().naive_utc(),
            table_name: record.table_name.to_string(),
            action: match record.action {
                RowActionType::Upsert => SyncAction::Upsert,
                RowActionType::Delete => SyncAction::Delete,
            },
            data: SyncRecordData(record.data),
            sync_version: SyncVersion::V7,
            source_site_id,
            store_id: record.store_id,
            transfer_store_id: record.transfer_store_id,
            patient_id: record.patient_id,
            ..Default::default()
        })
        .collect();

    validate_translate_integrate_in_memory(connection, &buffer_rows, SyncContext::PatientLookup)?;

    Ok(nsj_id)
}

#[cfg(test)]
mod test {
    use crate::{
        sync::settings::SyncSettings,
        sync_v7::patient_lookup::pull_and_integrate_patient_data,
        test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
    };
    use actix_web::{web, App, HttpRequest, HttpServer};
    use repository::{
        mock::{MockData, MockDataInserts},
        KeyType, KeyValueStoreRow, NameRow, NameRowRepository, NameRowType, SyncBufferRepository,
    };
    use serde_json::json;
    use tokio::sync::Mutex;

    fn patient() -> NameRow {
        NameRow {
            id: "patient_1".to_string(),
            name: "Patient, Test".to_string(),
            r#type: NameRowType::Patient,
            ..Default::default()
        }
    }

    const NSJ_ID: &str = "nsj_patient_test";

    async fn patient_data_handler(
        received_requests: web::Data<Mutex<Vec<serde_json::Value>>>,
        _req: HttpRequest,
        body: web::Json<serde_json::Value>,
    ) -> actix_web::HttpResponse {
        received_requests.lock().await.push(body.into_inner());
        actix_web::HttpResponse::Ok().json(json!({
            "Ok": {
                "siteId": 1,
                "maxCursor": 1,
                "nameStoreJoinId": NSJ_ID,
                "records": [
                    {
                        "cursor": 1,
                        "recordId": "patient_1",
                        "tableName": "Name",
                        "action": "Upsert",
                        "data": patient(),
                        "storeId": null,
                        "transferStoreId": null,
                        "patientId": "patient_1",
                    }
                ]
            }
        }))
    }

    #[actix_rt::test]
    async fn pull_and_integrate_patient_data_success() {
        let mock_data = MockData {
            key_value_store_rows: vec![
                KeyValueStoreRow {
                    id: KeyType::SettingsSyncSiteId,
                    value_int: Some(2),
                    ..Default::default()
                },
                KeyValueStoreRow {
                    id: KeyType::SettingsSyncCentralServerSiteId,
                    value_int: Some(1),
                    ..Default::default()
                },
                KeyValueStoreRow {
                    id: KeyType::SettingsSyncV7Token,
                    value_string: Some("test_token".to_string()),
                    ..Default::default()
                },
            ],
            ..Default::default()
        };

        let ServiceTestContext {
            service_provider,
            connection,
            service_context,
            ..
        } = setup_all_with_data_and_service_provider(
            "pull_and_integrate_patient_data_success",
            MockDataInserts::none(),
            mock_data,
        )
        .await;

        let received_requests = web::Data::new(Mutex::new(Vec::<serde_json::Value>::new()));
        let server = HttpServer::new({
            let received_requests = received_requests.clone();
            move || {
                App::new().app_data(received_requests.clone()).route(
                    "/central/sync_v7/patient_data_for_site",
                    web::post().to(patient_data_handler),
                )
            }
        })
        .bind("127.0.0.1:0")
        .unwrap();

        let addr = *server.addrs().first().unwrap();
        let server_handle = server.run();
        let handle = server_handle.handle();
        tokio::spawn(server_handle);

        service_provider
            .settings
            .update_sync_settings(
                &service_context,
                &SyncSettings {
                    url: format!("http://{}/", addr),
                    username: "test_user".to_string(),
                    password_sha256: "test_pass".to_string(),
                    interval_seconds: 0,
                    ..Default::default()
                },
            )
            .unwrap();

        let result =
            pull_and_integrate_patient_data(&service_provider, "patient_1", "store_1", "nsj_1")
                .await;

        handle.stop(true).await;
        assert_eq!(result.unwrap(), NSJ_ID);

        // Mock central received the request.
        let requests = received_requests.lock().await.clone();
        assert_eq!(requests.len(), 1);
        assert_eq!(requests[0]["patientId"], "patient_1");
        assert_eq!(requests[0]["storeId"], "store_1");
        assert_eq!(requests[0]["nameStoreJoinId"], "nsj_1");

        // Patient lookup integrates directly from memory, nothing persisted to sync_buffer.
        let buffers = SyncBufferRepository::new(&connection).get_all().unwrap();
        assert!(
            buffers.is_empty(),
            "patient lookup should not write to sync_buffer, got {:?}",
            buffers
        );

        // Patient name row landed locally.
        let stored = NameRowRepository::new(&connection)
            .find_one_by_id("patient_1")
            .unwrap()
            .expect("patient name row should exist locally");
        assert_eq!(stored.name, "Patient, Test");
        assert_eq!(stored.r#type, NameRowType::Patient);
    }
}
