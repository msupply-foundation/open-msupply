#[cfg(test)]
mod query {
    use repository::{
        mock::{mock_store_a, MockDataInserts},
        test_db::setup_all,
    };

    use crate::{
        asset::insert::{InsertAsset, InsertAssetError},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn asset_service_insert() {
        let (_, _connection, connection_manager, _) =
            setup_all("asset_service_insert", MockDataInserts::none().stores()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
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
                    code: "test_code".to_string(),
                    serial_number: Some("test_serial_number".to_string()),
                    catalogue_item_id: Some("189ef51c-d232-4da7-b090-ca3a53d31f58".to_string()), // 'GKS Healthsol LLP', 'FFVC 44SR'
                    installation_date: None,
                    replacement_date: None,
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

        // 2. Check we can't create an asset with the same id
        assert_eq!(
            service.insert_asset(
                &ctx,
                InsertAsset {
                    id: id.clone(),
                    store_id: Some(mock_store_a().id),
                    notes: Some("test_note".to_string()),
                    code: "test_code".to_string(),
                    serial_number: Some("test_serial_number".to_string()),
                    catalogue_item_id: Some("189ef51c-d232-4da7-b090-ca3a53d31f58".to_string()), // 'GKS Healthsol LLP', 'FFVC 44SR'
                    installation_date: None,
                    replacement_date: None,
                },
            ),
            Err(InsertAssetError::AssetAlreadyExists)
        );

        // 3. Check we can't create an asset with the same serial number
        assert_eq!(
            service.insert_asset(
                &ctx,
                InsertAsset {
                    id: "new_id".to_string(),
                    store_id: Some(mock_store_a().id),
                    notes: Some("test_note".to_string()),
                    code: "test_code".to_string(),
                    serial_number: Some("test_serial_number".to_string()),
                    catalogue_item_id: Some("189ef51c-d232-4da7-b090-ca3a53d31f58".to_string()), // 'GKS Healthsol LLP', 'FFVC 44SR'
                    installation_date: None,
                    replacement_date: None,
                },
            ),
            Err(InsertAssetError::SerialNumberAlreadyExists)
        );
    }
}
