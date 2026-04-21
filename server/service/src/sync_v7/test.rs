#[cfg(test)]
mod pull_integration {
    use actix_web::{web, App, HttpServer};
    use repository::{
        mock::MockDataInserts, test_db::setup_all, ChangelogFilter, ChangelogRepository,
        ChangelogRow, ChangelogTableName, CurrencyRow, EqualFilter, ItemRow, KeyType,
        KeyValueStoreRepository, NameRow, RowActionType, StockLineRow, StoreRow,
        SyncBufferRowRepository, UnitRow, Upsert,
    };
    use repository::{SyncAction, SyncBufferRow};
    use serde_json::json;

    use crate::sync::settings::SyncSettings;
    use crate::sync_v7::sync::sync_v7;

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

    // ---- Mock server handlers ----

    async fn site_status() -> actix_web::HttpResponse {
        actix_web::HttpResponse::Ok().json(json!({
            "Ok": { "site_id": 1, "central_site_id": 0 }
        }))
    }

    async fn push() -> actix_web::HttpResponse {
        actix_web::HttpResponse::Ok().json(json!({ "Ok": 0 }))
    }

    async fn pull() -> actix_web::HttpResponse {
        actix_web::HttpResponse::Ok().json(json!({
            "Ok": {
                "siteId": 1,
                "maxCursor": 6,
                "records": [
                    {
                        "cursor": 1,
                        "recordId": "unit_test_1",
                        "tableName": "Unit",
                        "action": "Upsert",
                        "data": unit(),
                        "storeId": null,
                        "transferStoreId": null,
                        "patientId": null
                    },
                    {
                        "cursor": 2,
                        "recordId": "currency_test_1",
                        "tableName": "Currency",
                        "action": "Upsert",
                        "data": currency(),
                        "storeId": null,
                        "transferStoreId": null,
                        "patientId": null
                    },
                    {
                        "cursor": 3,
                        "recordId": "name_test_1",
                        "tableName": "Name",
                        "action": "Upsert",
                        "data": name(),
                        "storeId": null,
                        "transferStoreId": null,
                        "patientId": null
                    },
                    {
                        "cursor": 4,
                        "recordId": "item_test_1",
                        "tableName": "Item",
                        "action": "Upsert",
                        "data": item(),
                        "storeId": null,
                        "transferStoreId": null,
                        "patientId": null
                    },
                    {
                        "cursor": 5,
                        "recordId": "store_test_1",
                        "tableName": "Store",
                        "action": "Upsert",
                        "data": store(),
                        "storeId": null,
                        "transferStoreId": null,
                        "patientId": null
                    },
                    {
                        "cursor": 6,
                        "recordId": "stock_line_test_1",
                        "tableName": "StockLine",
                        "action": "Upsert",
                        "data": stock_line(),
                        "storeId": "store_test_1",
                        "transferStoreId": null,
                        "patientId": null
                    }
                ]
            }
        }))
    }

    // ---- Test ----

    #[actix_rt::test]
    async fn test_sync_v7_pull_and_integrate() {
        let (_, connection, _, _) =
            setup_all("test_sync_v7_pull_and_integrate", MockDataInserts::none()).await;

        let kvs = KeyValueStoreRepository::new(&connection);
        kvs.set_i32(KeyType::SettingsSyncSiteId, Some(1)).unwrap();

        // Start mock server
        let server = HttpServer::new(|| {
            App::new()
                .route("/central/sync_v7/site_status", web::post().to(site_status))
                .route("/central/sync_v7/push", web::post().to(push))
                .route("/central/sync_v7/pull", web::post().to(pull))
        })
        .bind("127.0.0.1:0")
        .unwrap();

        let addr = server.addrs().first().unwrap().clone();
        let server_handle = server.run();
        let handle = server_handle.handle();
        tokio::spawn(server_handle);

        // Run sync
        let result = sync_v7(
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

        // Assert: pull cursor was updated
        let cursor = kvs.get_i32(KeyType::SyncPullCursorV7).unwrap();
        assert_eq!(cursor, Some(7), "Pull cursor should be maxCursor + 1");
    }
}
