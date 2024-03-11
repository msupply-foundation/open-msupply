#[cfg(test)]
mod query {
    use repository::{
        mock::{asset::mock_asset_a, mock_store_a, MockDataInserts},
        test_db::setup_all,
    };

    use crate::{
        asset::{
            insert::InsertAsset,
            update::{UpdateAsset, UpdateAssetError},
        },
        service_provider::ServiceProvider,
        NullableUpdate,
    };

    #[actix_rt::test]
    async fn asset_service_update() {
        let (_, _connection, connection_manager, _) =
            setup_all("asset_service_update", MockDataInserts::none().assets()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.asset_service;

        // Create an asset to update
        let id = "test_id".to_string();
        let _asset = service
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

        // 2. Check we can't update the asset to use a serial number that already exists
        assert_eq!(
            service.update_asset(
                &ctx,
                UpdateAsset {
                    id: id.clone(),
                    serial_number: Some(NullableUpdate {
                        value: mock_asset_a().serial_number
                    }),
                    ..Default::default()
                }
            ),
            Err(UpdateAssetError::SerialNumberAlreadyExists)
        );

        // 3. Check we can update the asset to use a serial number that doesn't already exist
        let updated_asset = service
            .update_asset(
                &ctx,
                UpdateAsset {
                    id: id.clone(),
                    serial_number: Some(NullableUpdate {
                        value: Some("new_serial_number".to_string()),
                    }),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(
            updated_asset.serial_number,
            Some("new_serial_number".to_string())
        );

        // 4. Check if we update the notes, it doesn't remove the serial number
        let updated_asset = service
            .update_asset(
                &ctx,
                UpdateAsset {
                    id,
                    notes: Some("new_note".to_string()),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_eq!(updated_asset.notes, Some("new_note".to_string()));
        assert_eq!(
            updated_asset.serial_number,
            Some("new_serial_number".to_string())
        );
    }
}
