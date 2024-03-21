#[cfg(test)]
mod query {
    use repository::{
        asset_internal_location_row::AssetInternalLocationRowRepository,
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
        let (_, connection, connection_manager, _) = setup_all(
            "asset_service_update",
            MockDataInserts::none().assets().locations(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.asset_service;
        let asset_location_repository = AssetInternalLocationRowRepository::new(&connection);

        // Create two assets to update
        let id = "test_id".to_string();
        let id2 = "test_id_2".to_string();
        let _asset = service
            .insert_asset(
                &ctx,
                InsertAsset {
                    id: id.clone(),
                    store_id: Some(mock_store_a().id),
                    notes: Some("test_note".to_string()),
                    serial_number: Some("test_serial_number".to_string()),
                    asset_number: id.clone(),
                    catalogue_item_id: Some("189ef51c-d232-4da7-b090-ca3a53d31f58".to_string()), // 'GKS Healthsol LLP', 'FFVC 44SR'
                    installation_date: None,
                    replacement_date: None,
                },
            )
            .unwrap();

        let _asset_2 = service
            .insert_asset(
                &ctx,
                InsertAsset {
                    id: id2.clone(),
                    store_id: Some(mock_store_a().id),
                    notes: None,
                    serial_number: None,
                    asset_number: id2.clone(),
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
                    id: id.clone(),
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

        // 5. Check can add a location to the asset
        let location_ids_to_add = vec!["location_1".to_string(), "location_2".to_string()];
        let _updated_asset = service
            .update_asset(
                &ctx,
                UpdateAsset {
                    id: id.clone(),
                    location_ids: Some(location_ids_to_add.clone()),
                    ..Default::default()
                },
            )
            .unwrap();
        let asset_location_ids: Vec<String> = asset_location_repository
            .find_all_by_asset(id.clone())
            .unwrap()
            .into_iter()
            .map(|location| location.location_id)
            .collect();

        assert_eq!(asset_location_ids, location_ids_to_add);

        // 6. Check location remains after updating with no location ids

        let _updated_asset = service
            .update_asset(
                &ctx,
                UpdateAsset {
                    id: id.clone(),
                    notes: Some("new_note".to_string()),
                    ..Default::default()
                },
            )
            .unwrap();

        let asset_location_ids: Vec<String> = asset_location_repository
            .find_all_by_asset(id.clone())
            .unwrap()
            .into_iter()
            .map(|location| location.location_id)
            .collect();

        assert_eq!(asset_location_ids, location_ids_to_add);

        // 7. Check fail on trying to add locations which are already assigned to other assets

        assert_eq!(
            service
                .update_asset(
                    &ctx,
                    UpdateAsset {
                        id: id2.clone(),
                        location_ids: Some(location_ids_to_add.clone()),
                        ..Default::default()
                    },
                )
                .is_err(),
            true
        );
        // 8. Check that adding a new location array which includes locations already assigned won't prompt error

        let location_ids_to_add = vec![
            "location_1".to_string(),
            "location_2".to_string(),
            "location_3".to_string(),
        ];

        let _updated_asset = service
            .update_asset(
                &ctx,
                UpdateAsset {
                    id: id.clone(),
                    location_ids: Some(location_ids_to_add.clone()),
                    ..Default::default()
                },
            )
            .unwrap();
        let asset_location_ids: Vec<String> = asset_location_repository
            .find_all_by_asset(id.clone())
            .unwrap()
            .into_iter()
            .map(|location| location.location_id)
            .collect();

        assert_eq!(asset_location_ids, location_ids_to_add);

        // 9. Check locations are removed when passed empty string

        let _updated_asset = service
            .update_asset(
                &ctx,
                UpdateAsset {
                    id: id.clone(),
                    location_ids: Some([].to_vec()),
                    ..Default::default()
                },
            )
            .unwrap();

        let asset_location_ids: Vec<String> = asset_location_repository
            .find_all_by_asset(id.clone())
            .unwrap()
            .into_iter()
            .map(|location| location.location_id)
            .collect();
        let empty_vec: Vec<String> = [].to_vec();

        assert_eq!(asset_location_ids, empty_vec);
    }
}
