#[cfg(test)]
mod pull_integration {
    use actix_web::{http::header::AUTHORIZATION, web, App, HttpRequest, HttpServer};
    use assert_json_diff::assert_json_include;
    use repository::{
        migrations::Version, mock::MockDataInserts, ChangelogFilter, ChangelogRepository,
        ChangelogRow, ChangelogTableName, CurrencyRow, EqualFilter, ItemRow, KeyType,
        KeyValueStoreRepository, NameRow, RowActionType, StockLineRow, StorageConnection, StoreRow,
        SyncBufferRowRepository, UnitRow, Upsert,
    };
    use repository::{SyncAction, SyncBufferRow};
    use serde_json::json;

    use crate::sync::settings::SyncSettings;
    use crate::sync_v7::api::{APP_VERSION_HEADER, HARDWARE_ID_HEADER};
    use crate::sync_v7::sync::sync_v7;
    use crate::test_helpers::{setup_all_and_service_provider, ServiceTestContext};

    // ---- Test data: expected rows after integration ----

    fn unit() -> UnitRow {
        UnitRow {
            id: "unit_test_1".to_string(),
            name: "Each".to_string(),
            description: None,
            index: 1,
            is_active: true,
        }
    }

    fn currency() -> CurrencyRow {
        CurrencyRow {
            id: "currency_test_1".to_string(),
            rate: 1.0,
            code: "USD".to_string(),
            is_home_currency: true,
            date_updated: None,
            is_active: true,
        }
    }

    fn name() -> NameRow {
        NameRow {
            id: "name_test_1".to_string(),
            name: "Test Name".to_string(),
            code: "test_name".to_string(),
            ..Default::default()
        }
    }

    fn item() -> ItemRow {
        ItemRow {
            id: "item_test_1".to_string(),
            name: "Test Item".to_string(),
            code: "test_item".to_string(),
            ..Default::default()
        }
    }

    fn store() -> StoreRow {
        StoreRow {
            id: "store_test_1".to_string(),
            name_id: "name_test_1".to_string(),
            code: "test_store".to_string(),
            site_id: 1,
            ..Default::default()
        }
    }

    fn stock_line() -> StockLineRow {
        StockLineRow {
            id: "stock_line_test_1".to_string(),
            item_link_id: "item_test_1".to_string(),
            store_id: "store_test_1".to_string(),
            pack_size: 1.0,
            available_number_of_packs: 100.0,
            total_number_of_packs: 100.0,
            ..Default::default()
        }
    }

    fn test_records() -> Vec<Box<dyn Upsert>> {
        vec![
            Box::new(unit()),
            Box::new(currency()),
            Box::new(name()),
            Box::new(item()),
            Box::new(store()),
            Box::new(stock_line()),
        ]
    }

    fn fk_order_test_records() -> Vec<Box<dyn Upsert>> {
        vec![Box::new(unit()), Box::new(name()), Box::new(store())]
    }

    // ---- Mock pull responses ----

    fn pull_response_in_fk_order() -> serde_json::Value {
        json!({
            "Ok": {
                "siteId": 1,
                "maxCursor": 6,
                "records": [
                    { "cursor": 1, "recordId": "unit_test_1",       "tableName": "Unit",       "action": "Upsert", "data": unit(),       "storeId": null,            "transferStoreId": null, "patientId": null },
                    { "cursor": 2, "recordId": "currency_test_1",   "tableName": "Currency",   "action": "Upsert", "data": currency(),   "storeId": null,            "transferStoreId": null, "patientId": null },
                    { "cursor": 3, "recordId": "name_test_1",       "tableName": "Name",       "action": "Upsert", "data": name(),       "storeId": null,            "transferStoreId": null, "patientId": null },
                    { "cursor": 4, "recordId": "item_test_1",       "tableName": "Item",       "action": "Upsert", "data": item(),       "storeId": null,            "transferStoreId": null, "patientId": null },
                    { "cursor": 5, "recordId": "store_test_1",      "tableName": "Store",      "action": "Upsert", "data": store(),      "storeId": null,            "transferStoreId": null, "patientId": null },
                    { "cursor": 6, "recordId": "stock_line_test_1", "tableName": "StockLine",  "action": "Upsert", "data": stock_line(), "storeId": "store_test_1",  "transferStoreId": null, "patientId": null },
                ]
            }
        })
    }

    /// Children before parents. Store has an FK to Name (via name_link);
    /// integration must reorder or it hits a DB-level FK violation.
    fn pull_response_reversed() -> serde_json::Value {
        json!({
            "Ok": {
                "siteId": 1,
                "maxCursor": 3,
                "records": [
                    { "cursor": 1, "recordId": "store_test_1", "tableName": "Store", "action": "Upsert", "data": store(), "storeId": null, "transferStoreId": null, "patientId": null },
                    { "cursor": 2, "recordId": "name_test_1",  "tableName": "Name",  "action": "Upsert", "data": name(),  "storeId": null, "transferStoreId": null, "patientId": null },
                    { "cursor": 3, "recordId": "unit_test_1",  "tableName": "Unit",  "action": "Upsert", "data": unit(),  "storeId": null, "transferStoreId": null, "patientId": null },
                ]
            }
        })
    }

    // ---- Mock server handlers ----

    fn assert_auth_headers(req: &HttpRequest) {
        let headers = req.headers();
        assert_eq!(
            headers.get(AUTHORIZATION).and_then(|v| v.to_str().ok()),
            Some("Bearer test_token"),
        );
        assert_eq!(
            headers
                .get(APP_VERSION_HEADER)
                .and_then(|v| v.to_str().ok()),
            Some(Version::from_package_json().to_string().as_str()),
        );
        assert!(headers.get(HARDWARE_ID_HEADER).is_some());
    }

    async fn site_status(req: HttpRequest) -> actix_web::HttpResponse {
        assert_auth_headers(&req);
        actix_web::HttpResponse::Ok().json(json!({
            "Ok": { "siteId": 1, "centralSiteId": 0 }
        }))
    }

    async fn push(req: HttpRequest, body: web::Json<serde_json::Value>) -> actix_web::HttpResponse {
        assert_auth_headers(&req);
        assert_json_include!(
            actual: body.into_inner(),
            expected: json!({
                "siteId": 1,
                "maxCursor": 0,
                "records": [],
            })
        );
        actix_web::HttpResponse::Ok().json(json!({ "Ok": 0 }))
    }

    async fn pull(
        data: web::Data<serde_json::Value>,
        req: HttpRequest,
        body: web::Json<serde_json::Value>,
    ) -> actix_web::HttpResponse {
        assert_auth_headers(&req);
        assert_json_include!(
            actual: body.into_inner(),
            expected: json!({
                "cursor": 0,
                "batchSize": 5000,
                "isInitialising": true,
            })
        );
        actix_web::HttpResponse::Ok().json(data.get_ref())
    }

    // ---- Shared test setup ----

    /// Runs sync_v7 against a mock central with the given pull response.
    /// Returns the connection for per-test assertions.
    async fn run_sync_v7_test(
        db_name: &str,
        pull_response: serde_json::Value,
    ) -> StorageConnection {
        let ServiceTestContext {
            service_provider,
            connection,
            ..
        } = setup_all_and_service_provider(db_name, MockDataInserts::none()).await;

        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(1))
            .unwrap();
        KeyValueStoreRepository::new(&connection)
            .set_string(KeyType::SettingsSyncV7Token, Some("test_token".to_string()))
            .unwrap();

        let pull_data = web::Data::new(pull_response);
        let server = HttpServer::new(move || {
            App::new()
                .app_data(pull_data.clone())
                .route("/central/sync_v7/site_status", web::post().to(site_status))
                .route("/central/sync_v7/push", web::post().to(push))
                .route("/central/sync_v7/pull", web::post().to(pull))
        })
        .bind("127.0.0.1:0")
        .unwrap();

        let addr = *server.addrs().first().unwrap();
        let server_handle = server.run();
        let handle = server_handle.handle();
        tokio::spawn(server_handle);

        let result = sync_v7(
            &service_provider,
            &connection,
            SyncSettings {
                url: format!("http://{}/", addr),
                username: "test_user".to_string(),
                password_sha256: "test_pass".to_string(),
                interval_seconds: 0,
                ..Default::default()
            },
            true,
        )
        .await;
        assert!(result.is_ok(), "sync_v7 failed: {:?}", result.err());
        handle.stop(true).await;

        connection
    }

    // ---- Test ----

    #[actix_rt::test]
    async fn test_sync_v7_pull_and_integrate() {
        let connection = run_sync_v7_test(
            "test_sync_v7_pull_and_integrate",
            pull_response_in_fk_order(),
        )
        .await;

        // Assert: all records were integrated into their tables
        for record in test_records() {
            record.assert_upserted(&connection);
        }

        // Assert: sync buffer rows
        let buffers = SyncBufferRowRepository::new(&connection).get_all().unwrap();
        assert_eq!(buffers.len(), 6);
        for buf in &buffers {
            assert!(buf.integration_datetime.is_some());
        }
        assert_eq!(
            buffers,
            vec![
                SyncBufferRow {
                    record_id: "unit_test_1".to_string(),
                    table_name: "unit".to_string(),
                    action: SyncAction::Upsert,
                    source_site_id: Some(1),
                    integration_error: None,
                    store_id: None,
                    transfer_store_id: None,
                    patient_id: None,
                    ..buffers[0].clone()
                },
                SyncBufferRow {
                    record_id: "currency_test_1".to_string(),
                    table_name: "currency".to_string(),
                    action: SyncAction::Upsert,
                    source_site_id: Some(1),
                    integration_error: None,
                    store_id: None,
                    transfer_store_id: None,
                    patient_id: None,
                    ..buffers[1].clone()
                },
                SyncBufferRow {
                    record_id: "name_test_1".to_string(),
                    table_name: "name".to_string(),
                    action: SyncAction::Upsert,
                    source_site_id: Some(1),
                    integration_error: None,
                    store_id: None,
                    transfer_store_id: None,
                    patient_id: None,
                    ..buffers[2].clone()
                },
                SyncBufferRow {
                    record_id: "item_test_1".to_string(),
                    table_name: "item".to_string(),
                    action: SyncAction::Upsert,
                    source_site_id: Some(1),
                    integration_error: None,
                    store_id: None,
                    transfer_store_id: None,
                    patient_id: None,
                    ..buffers[3].clone()
                },
                SyncBufferRow {
                    record_id: "store_test_1".to_string(),
                    table_name: "store".to_string(),
                    action: SyncAction::Upsert,
                    source_site_id: Some(1),
                    integration_error: None,
                    store_id: None,
                    transfer_store_id: None,
                    patient_id: None,
                    ..buffers[4].clone()
                },
                SyncBufferRow {
                    record_id: "stock_line_test_1".to_string(),
                    table_name: "stock_line".to_string(),
                    action: SyncAction::Upsert,
                    source_site_id: Some(1),
                    integration_error: None,
                    store_id: Some("store_test_1".to_string()),
                    transfer_store_id: None,
                    patient_id: None,
                    ..buffers[5].clone()
                },
            ]
        );

        // Assert: changelog entries
        let changelogs = ChangelogRepository::new(&connection)
            .changelogs(
                0,
                100,
                Some(ChangelogFilter::new().source_site_id(EqualFilter::equal_to(1))),
            )
            .unwrap();
        assert_eq!(changelogs.len(), 6);
        assert_eq!(
            changelogs,
            vec![
                ChangelogRow {
                    table_name: ChangelogTableName::Unit,
                    record_id: "unit_test_1".to_string(),
                    row_action: RowActionType::Upsert,
                    source_site_id: Some(1),
                    ..changelogs[0].clone()
                },
                ChangelogRow {
                    table_name: ChangelogTableName::Currency,
                    record_id: "currency_test_1".to_string(),
                    row_action: RowActionType::Upsert,
                    source_site_id: Some(1),
                    ..changelogs[1].clone()
                },
                ChangelogRow {
                    table_name: ChangelogTableName::Name,
                    record_id: "name_test_1".to_string(),
                    row_action: RowActionType::Upsert,
                    source_site_id: Some(1),
                    ..changelogs[2].clone()
                },
                ChangelogRow {
                    table_name: ChangelogTableName::Item,
                    record_id: "item_test_1".to_string(),
                    row_action: RowActionType::Upsert,
                    source_site_id: Some(1),
                    ..changelogs[3].clone()
                },
                ChangelogRow {
                    table_name: ChangelogTableName::Store,
                    record_id: "store_test_1".to_string(),
                    row_action: RowActionType::Upsert,
                    source_site_id: Some(1),
                    ..changelogs[4].clone()
                },
                ChangelogRow {
                    table_name: ChangelogTableName::StockLine,
                    record_id: "stock_line_test_1".to_string(),
                    row_action: RowActionType::Upsert,
                    source_site_id: Some(1),
                    store_id: Some("store_test_1".to_string()),
                    ..changelogs[5].clone()
                },
            ]
        );

        // Assert: pull cursor advanced to the last record's cursor
        let cursor = KeyValueStoreRepository::new(&connection)
            .get_i32(KeyType::SyncPullCursorV7)
            .unwrap();
        assert_eq!(cursor, Some(6));
    }

    /// Records arriving children-before-parents still all integrate because
    /// the loop iterates INTEGRATION_ORDER, not sync_buffer arrival order.
    #[actix_rt::test]
    async fn test_sync_v7_integrates_records_out_of_fk_order() {
        let connection = run_sync_v7_test(
            "test_sync_v7_integrates_records_out_of_fk_order",
            pull_response_reversed(),
        )
        .await;

        // FK violations would surface via integration_error.
        let buffers = SyncBufferRowRepository::new(&connection).get_all().unwrap();
        assert_eq!(buffers.len(), 3);
        for buf in &buffers {
            assert_eq!(
                buf.integration_error, None,
                "record {} ({}) failed to integrate",
                buf.record_id, buf.table_name,
            );
            assert!(
                buf.integration_datetime.is_some(),
                "record {} ({}) was never integrated",
                buf.record_id,
                buf.table_name,
            );
        }

        // Assert: all records were integrated into their tables
        for record in fk_order_test_records() {
            record.assert_upserted(&connection);
        }
    }
}

#[cfg(test)]
mod push_test {
    use std::sync::Mutex;

    use actix_web::{web, App, HttpResponse, HttpServer};
    use assert_json_diff::assert_json_include;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, KeyType, KeyValueStoreRepository, StockLineRow,
        StockLineRowRepository,
    };
    use serde_json::{json, Value};

    use crate::sync_v7::api::{SyncApiV7, VERSION};
    use crate::sync_v7::sync::SyncV7;
    use crate::sync_v7::sync_logger::SyncLogger;

    async fn push(
        captured_requests: web::Data<Mutex<Vec<Value>>>,
        req: web::Json<Value>,
    ) -> HttpResponse {
        captured_requests.lock().unwrap().push(req.into_inner());
        HttpResponse::Ok().json(json!({ "Ok": 0 }))
    }

    #[actix_rt::test]
    async fn test_sync_v7_push() {
        let batch_size: u32 = 2;

        // store_a (site_id 100) and item_a come from MockDataInserts.
        let (_, connection, _, _) = setup_all(
            "test_sync_v7_push",
            MockDataInserts::none().names().stores().items(),
        )
        .await;

        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(100))
            .unwrap();

        let stock_line_repo = StockLineRowRepository::new(&connection);
        stock_line_repo
            .upsert_one(&StockLineRow {
                id: "stock_line_test_1".into(),
                item_link_id: "item_a".into(),
                store_id: "store_a".into(),
                ..Default::default()
            })
            .unwrap();
        stock_line_repo
            .upsert_one(&StockLineRow {
                id: "stock_line_test_2".into(),
                item_link_id: "item_a".into(),
                store_id: "store_a".into(),
                ..Default::default()
            })
            .unwrap();
        stock_line_repo
            .upsert_one(&StockLineRow {
                id: "stock_line_test_3".into(),
                item_link_id: "item_a".into(),
                store_id: "store_a".into(),
                ..Default::default()
            })
            .unwrap();

        let captured_requests = web::Data::new(Mutex::new(Vec::<Value>::new()));
        let server_captured_requests = captured_requests.clone();
        let server = HttpServer::new(move || {
            App::new()
                .app_data(server_captured_requests.clone())
                .route("/central/sync_v7/push", web::post().to(push))
        })
        .bind("127.0.0.1:0")
        .unwrap();

        let addr = *server.addrs().first().unwrap();
        let server_handle = server.run();
        let handle = server_handle.handle();
        tokio::spawn(server_handle);

        // Construct SyncV7 directly so we can inject batch_size = 2
        let api = SyncApiV7 {
            url: format!("http://{addr}/").parse().unwrap(),
            version: VERSION,
            username: "test_user".into(),
            password: "test_pass".into(),
        };
        let sync_v7 = SyncV7::new(&connection, api, batch_size);
        let mut logger = SyncLogger::start(&connection).unwrap();
        sync_v7.push(&mut logger, false).await.unwrap();
        handle.stop(true).await;

        let captured_requests = captured_requests.lock().unwrap();
        assert_eq!(captured_requests.len(), 2);

        // First batch: 2 records (stock_line_test_1, stock_line_test_2)
        assert_json_include!(
            actual: captured_requests[0].clone(),
            expected: json!({
                "input": {
                    "records": [
                        { "recordId": "stock_line_test_1", "tableName": "StockLine", "action": "Upsert", "storeId": "store_a" },
                        { "recordId": "stock_line_test_2", "tableName": "StockLine", "action": "Upsert", "storeId": "store_a" },
                    ]
                }
            })
        );

        // Second batch: 1 record (stock_line_test_3)
        assert_json_include!(
            actual: captured_requests[1].clone(),
            expected: json!({
                "input": {
                    "records": [
                        { "recordId": "stock_line_test_3", "tableName": "StockLine", "action": "Upsert", "storeId": "store_a" },
                    ]
                }
            })
        );

        // Cursor advancement: batch 2 starts exactly one past batch 1's last cursor.
        let last_of_batch_1 = captured_requests[0]
            .pointer("/input/records/1/cursor")
            .unwrap()
            .as_i64()
            .unwrap();
        let first_of_batch_2 = captured_requests[1]
            .pointer("/input/records/0/cursor")
            .unwrap()
            .as_i64()
            .unwrap();
        assert_eq!(first_of_batch_2, last_of_batch_1 + 1);
    }
}
