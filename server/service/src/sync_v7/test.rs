#[cfg(test)]
mod pull_integration {
    use std::sync::{Arc, Mutex};

    use actix_web::{web, App, HttpServer};
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ChangelogFilter, ChangelogRepository,
        ChangelogRow, ChangelogTableName, CurrencyRow, EqualFilter, ItemRow, ItemRowRepository,
        KeyType, KeyValueStoreRepository, NameRow, NameRowRepository, RowActionType, StockLineRow,
        StockLineRowRepository, StorageConnection, StoreRow, StoreRowRepository,
        SyncBufferRowRepository, UnitRow, Upsert,
    };
    use repository::{SyncAction, SyncBufferRow};
    use serde_json::json;

    use crate::sync_v7::{
        api::{Request as ApiRequest, SyncApiV7, VERSION},
        sync::{SyncBatchV7, SyncV7},
        sync_logger::SyncLogger,
    };

    type CapturedPushes = Arc<Mutex<Vec<SyncBatchV7>>>;

    // ---- Mock server handlers ----

    async fn site_status() -> actix_web::HttpResponse {
        actix_web::HttpResponse::Ok().json(json!({
            "Ok": { "site_id": 1, "central_site_id": 0 }
        }))
    }

    async fn push(
        captured: web::Data<CapturedPushes>,
        body: web::Json<ApiRequest<SyncBatchV7>>,
    ) -> actix_web::HttpResponse {
        let count = body.input.records.len() as i64;
        captured.lock().unwrap().push(body.into_inner().input);
        actix_web::HttpResponse::Ok().json(json!({ "Ok": count }))
    }

    async fn pull(data: web::Data<serde_json::Value>) -> actix_web::HttpResponse {
        actix_web::HttpResponse::Ok().json(data.get_ref())
    }

    // ---- Shared test setup ----

    async fn setup_test_db(db_name: &str) -> StorageConnection {
        let (_, connection, _, _) = setup_all(db_name, MockDataInserts::none()).await;
        KeyValueStoreRepository::new(&connection)
            .set_i32(KeyType::SettingsSyncSiteId, Some(1))
            .unwrap();
        connection
    }

    /// Starts a mock central and returns a `SyncV7` pointed at it, plus the
    /// captured-pushes handle.
    async fn start_mock_central<'a>(
        connection: &'a StorageConnection,
        pull_response: serde_json::Value,
        batch_size: u32,
    ) -> (SyncV7<'a>, CapturedPushes) {
        let pull_data = web::Data::new(pull_response);
        let captured: CapturedPushes = Arc::new(Mutex::new(Vec::new()));
        let captured_data = web::Data::new(captured.clone());

        let server = HttpServer::new(move || {
            App::new()
                .app_data(pull_data.clone())
                .app_data(captured_data.clone())
                .route("/central/sync_v7/site_status", web::post().to(site_status))
                .route("/central/sync_v7/push", web::post().to(push))
                .route("/central/sync_v7/pull", web::post().to(pull))
        })
        .bind("127.0.0.1:0")
        .unwrap();

        let addr = server.addrs().first().unwrap().clone();
        tokio::spawn(server.run());

        let sync_v7 = SyncV7::new(
            connection,
            SyncApiV7 {
                url: format!("http://{}/", addr).parse().unwrap(),
                version: VERSION,
                username: "test_user".to_string(),
                password: "test_pass".to_string(),
            },
            batch_size,
        );

        (sync_v7, captured)
    }

    // ============================================================
    // Pull tests
    // ============================================================

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

    // ---- Tests ----

    #[actix_rt::test]
    async fn test_sync_v7_pull_and_integrate() {
        let connection = setup_test_db("test_sync_v7_pull_and_integrate").await;
        let (sync_v7, _) = start_mock_central(&connection, pull_response_in_fk_order(), 5000).await;
        let mut logger = SyncLogger::start(&connection).unwrap();

        sync_v7.pull(&mut logger, true).await.unwrap();
        sync_v7.integrate(&mut logger, true).await.unwrap();

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
        let connection = setup_test_db("test_sync_v7_integrates_records_out_of_fk_order").await;
        let (sync_v7, _) = start_mock_central(&connection, pull_response_reversed(), 5000).await;
        let mut logger = SyncLogger::start(&connection).unwrap();

        sync_v7.pull(&mut logger, true).await.unwrap();
        sync_v7.integrate(&mut logger, true).await.unwrap();

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

    // ============================================================
    // Push tests
    // ============================================================
    //
    // Multi-batch cursor test included here: Push drives its loop from the local
    // changelog, so a passive mock works. (pull requires a response from
    // central to iterate the loop)

    #[actix_rt::test]
    async fn test_sync_v7_push_sends_remote_changes() {
        const SITE_ID: i32 = 1;
        let connection = setup_test_db("test_sync_v7_push_sends_remote_changes").await;

        NameRowRepository::new(&connection)
            .upsert_one(&NameRow {
                id: "name_1".to_string(),
                ..Default::default()
            })
            .unwrap();
        StoreRowRepository::new(&connection)
            .upsert_one(&StoreRow {
                id: "store_1".to_string(),
                name_id: "name_1".to_string(),
                code: "s1".to_string(),
                site_id: SITE_ID,
                ..Default::default()
            })
            .unwrap();
        ItemRowRepository::new(&connection)
            .upsert_one(&ItemRow {
                id: "item_1".to_string(),
                ..Default::default()
            })
            .unwrap();

        let cursor_1 = StockLineRowRepository::new(&connection)
            .upsert_one(&StockLineRow {
                id: "stock_1".to_string(),
                item_link_id: "item_1".to_string(),
                store_id: "store_1".to_string(),
                pack_size: 1.0,
                ..Default::default()
            })
            .unwrap();
        let cursor_2 = StockLineRowRepository::new(&connection)
            .upsert_one(&StockLineRow {
                id: "stock_2".to_string(),
                item_link_id: "item_1".to_string(),
                store_id: "store_1".to_string(),
                pack_size: 1.0,
                ..Default::default()
            })
            .unwrap();
        let cursor_3 = StockLineRowRepository::new(&connection)
            .upsert_one(&StockLineRow {
                id: "stock_3".to_string(),
                item_link_id: "item_1".to_string(),
                store_id: "store_1".to_string(),
                pack_size: 1.0,
                ..Default::default()
            })
            .unwrap();

        let (sync_v7, captured) = start_mock_central(&connection, json!(null), 2).await;
        let mut logger = SyncLogger::start(&connection).unwrap();

        sync_v7.push(&mut logger, false).await.unwrap();

        let pushes = captured.lock().unwrap();
        assert_eq!(
            pushes.len(),
            2,
            "expected two push calls (3 rows, batch_size 2)"
        );

        // First batch: 2 rows, both StockLine.
        assert_eq!(pushes[0].site_id, SITE_ID);
        assert_eq!(pushes[0].records.len(), 2);
        assert_eq!(pushes[0].records[0].cursor, cursor_1);
        assert_eq!(
            pushes[0].records[0].table_name,
            ChangelogTableName::StockLine
        );
        assert_eq!(pushes[0].records[1].cursor, cursor_2);

        // Second batch: 1 row (partial — triggers the loop's break).
        assert_eq!(pushes[1].records.len(), 1);
        assert_eq!(pushes[1].records[0].cursor, cursor_3);

        // Cursor advanced across iterations to the final batch's last record.
        let cursor = KeyValueStoreRepository::new(&connection)
            .get_i32(KeyType::SyncPushCursorV7)
            .unwrap();
        assert_eq!(
            cursor,
            Some(cursor_3 as i32),
            "Push cursor should advance to the final batch's last record",
        );
    }
}
