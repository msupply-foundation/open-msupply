#[cfg(test)]
mod query {
    use chrono::{Duration, Utc};
    use repository::{
        asset_internal_location_row::AssetInternalLocationRowRepository,
        asset_log_row::AssetLogType,
        assets::{
            asset_log::{AssetLogFilter, AssetLogRepository},
            asset_row::AssetRowRepository,
        },
        mock::{mock_store_a, mock_user_account_a, MockDataInserts},
        test_db::setup_all,
        EqualFilter,
    };

    use crate::{
        asset::{
            insert::{InsertAsset, InsertAssetError},
            insert_log::InsertAssetLog,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn asset_service_insert() {
        let (_, _connection, connection_manager, _) =
            setup_all("asset_service_insert", MockDataInserts::none().stores()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.asset_service;

        // 1. Check we can create an asset
        let id = "test_id".to_string();
        let asset = service
            .insert_asset(
                &ctx,
                InsertAsset {
                    id: id.clone(),
                    store_id: Some(mock_store_a().id),
                    notes: Some("test_note".to_string()),
                    asset_number: Some("test_code".to_string()),
                    serial_number: Some("test_serial_number".to_string()),
                    catalogue_item_id: Some("189ef51c-d232-4da7-b090-ca3a53d31f58".to_string()),
                    ..Default::default()
                },
            )
            .unwrap();

        assert_eq!(asset.id, id);
        // Check the created and modified date times are set
        assert!(
            asset.created_datetime >= chrono::Utc::now().naive_utc() - chrono::Duration::seconds(5)
        );
        assert!(
            asset.modified_datetime
                >= chrono::Utc::now().naive_utc() - chrono::Duration::seconds(5)
        );

        // Check that the asset has an internal location assigned
        let internal_location_repo = AssetInternalLocationRowRepository::new(&ctx.connection);
        let internal_locations = internal_location_repo.find_all_by_asset(&id).unwrap();
        assert_eq!(internal_locations.len(), 1);

        // 2. Check we can't create an asset with the same id
        assert_eq!(
            service.insert_asset(
                &ctx,
                InsertAsset {
                    id: id.clone(),
                    store_id: Some(mock_store_a().id),
                    notes: Some("test_note".to_string()),
                    asset_number: Some("test_code".to_string()),
                    serial_number: Some("test_serial_number".to_string()),
                    catalogue_item_id: Some("189ef51c-d232-4da7-b090-ca3a53d31f58".to_string()), // 'GKS Healthsol LLP', 'FFVC 44SR'
                    ..Default::default()
                },
            ),
            Err(InsertAssetError::AssetAlreadyExists)
        );

        // 3. Check we can't create an asset with the same asset number
        assert_eq!(
            service.insert_asset(
                &ctx,
                InsertAsset {
                    id: "new_id".to_string(),
                    store_id: Some(mock_store_a().id),
                    notes: Some("test_note".to_string()),
                    asset_number: Some("test_code".to_string()),
                    serial_number: Some("test_serial_number_2".to_string()),
                    catalogue_item_id: Some("189ef51c-d232-4da7-b090-ca3a53d31f58".to_string()), // 'GKS Healthsol LLP', 'FFVC 44SR'
                    ..Default::default()
                },
            ),
            Err(InsertAssetError::AssetNumberAlreadyExists)
        );

        // 4. Check we can't create an asset with the same serial number
        assert_eq!(
            service.insert_asset(
                &ctx,
                InsertAsset {
                    id: "new_id".to_string(),
                    store_id: Some(mock_store_a().id),
                    notes: Some("test_note".to_string()),
                    asset_number: Some("test_code_2".to_string()),
                    serial_number: Some("test_serial_number".to_string()),
                    catalogue_item_id: Some("189ef51c-d232-4da7-b090-ca3a53d31f58".to_string()), // 'GKS Healthsol LLP', 'FFVC 44SR'
                    ..Default::default()
                },
            ),
            Err(InsertAssetError::SerialNumberAlreadyExists)
        );
    }

    /// Regression test for #11413: CSV-imported mapping dates were stored only as static
    /// properties on the asset. When a UI mapping was later recorded, `recalculate_mapping_dates`
    /// would overwrite both dates from the (single) new log, losing the imported initial date.
    /// The fix creates synthetic `TemperatureMapping` logs at insert time so the imported dates
    /// survive future recalcs.
    #[actix_rt::test]
    async fn asset_service_insert_with_csv_mapping_dates_preserves_initial_date() {
        let (_, connection, connection_manager, _) = setup_all(
            "asset_service_insert_with_csv_mapping_dates",
            MockDataInserts::none().stores().user_accounts(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.asset_service;

        let asset_id = "csv_imported_asset".to_string();
        let csv_initial = "2024-01-15";
        let csv_recent = "2024-03-10";

        let properties = serde_json::json!({
            "initial_mapping_date": csv_initial,
            "most_recent_mapping_date": csv_recent,
        })
        .to_string();

        service
            .insert_asset(
                &ctx,
                InsertAsset {
                    id: asset_id.clone(),
                    store_id: Some(mock_store_a().id),
                    asset_number: Some("csv_asset_1".to_string()),
                    serial_number: Some("csv_serial_1".to_string()),
                    catalogue_item_id: Some("189ef51c-d232-4da7-b090-ca3a53d31f58".to_string()),
                    properties: Some(properties),
                    ..Default::default()
                },
            )
            .unwrap();

        // Synthetic TemperatureMapping logs should exist for both CSV dates
        let logs = AssetLogRepository::new(&connection)
            .query_by_filter(
                AssetLogFilter::new()
                    .asset_id(EqualFilter::equal_to(asset_id.clone()))
                    .r#type(AssetLogType::TemperatureMapping.equal_to()),
            )
            .unwrap();
        assert_eq!(logs.len(), 2);

        let log_dates: Vec<String> = logs
            .iter()
            .map(|l| l.log_datetime.format("%Y-%m-%d").to_string())
            .collect();
        assert!(log_dates.contains(&csv_initial.to_string()));
        assert!(log_dates.contains(&csv_recent.to_string()));

        // Now record a UI mapping with a new (later) date - the bug scenario
        let new_mapping_date = Utc::now() - Duration::days(1);
        service
            .insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: "ui_mapping_log".to_string(),
                    asset_id: asset_id.clone(),
                    status: None,
                    comment: None,
                    r#type: Some(AssetLogType::TemperatureMapping),
                    reason_id: None,
                    log_datetime: Some(new_mapping_date),
                },
            )
            .unwrap();

        // Initial date should still be the CSV one - the bug would have replaced it.
        let asset_row = AssetRowRepository::new(&connection)
            .find_one_by_id(&asset_id)
            .unwrap()
            .unwrap();
        let props: serde_json::Map<String, serde_json::Value> =
            serde_json::from_str(asset_row.properties.as_deref().unwrap()).unwrap();

        assert_eq!(
            props.get("initial_mapping_date").unwrap(),
            &serde_json::Value::String(csv_initial.to_string()),
            "initial_mapping_date should be preserved from CSV import"
        );
        assert_eq!(
            props.get("most_recent_mapping_date").unwrap(),
            &serde_json::Value::String(new_mapping_date.naive_utc().format("%Y-%m-%d").to_string()),
            "most_recent_mapping_date should be the latest mapping (the new UI one)"
        );
    }

    #[actix_rt::test]
    async fn asset_service_insert_with_only_initial_mapping_date() {
        let (_, connection, connection_manager, _) = setup_all(
            "asset_service_insert_with_only_initial_mapping_date",
            MockDataInserts::none().stores().user_accounts(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.asset_service;

        let asset_id = "asset_initial_only".to_string();
        let properties = serde_json::json!({
            "initial_mapping_date": "2024-02-01",
        })
        .to_string();

        service
            .insert_asset(
                &ctx,
                InsertAsset {
                    id: asset_id.clone(),
                    store_id: Some(mock_store_a().id),
                    asset_number: Some("init_only_1".to_string()),
                    serial_number: Some("init_only_serial".to_string()),
                    catalogue_item_id: Some("189ef51c-d232-4da7-b090-ca3a53d31f58".to_string()),
                    properties: Some(properties),
                    ..Default::default()
                },
            )
            .unwrap();

        let logs = AssetLogRepository::new(&connection)
            .query_by_filter(
                AssetLogFilter::new()
                    .asset_id(EqualFilter::equal_to(asset_id))
                    .r#type(AssetLogType::TemperatureMapping.equal_to()),
            )
            .unwrap();
        assert_eq!(logs.len(), 1);
        assert_eq!(
            logs[0].log_datetime.format("%Y-%m-%d").to_string(),
            "2024-02-01"
        );
    }

}
