#[cfg(test)]
mod query {
    use repository::{
        migrations::constants::{COLD_CHAIN_EQUIPMENT_UUID, REFRIGERATORS_AND_FREEZERS_UUID},
        mock::{mock_store_a, MockDataInserts},
        test_db::setup_all,
    };

    use crate::{
        catalogue::insert::{InsertAssetCatalogueItem, InsertAssetCatalogueItemError},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn asset_catalogue_item_service_insert() {
        let (_, _connection, connection_manager, _) = setup_all(
            "asset_catalogue_item_service_insert",
            MockDataInserts::none().stores(),
        )
        .await;

        const REFRIGERATORS_UUID: &str = "fd79171f-5da8-4801-b299-9426f34310a8";

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let ctx = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.catalogue_service;

        // 1. Check we can create an asset_catalogue_item
        let id = "test_id".to_string();
        let _asset_catalogue_item = service
            .insert_asset_catalogue_item(
                &ctx,
                InsertAssetCatalogueItem {
                    id: id.clone(),
                    sub_catalogue: "General".to_string(),
                    category_id: REFRIGERATORS_AND_FREEZERS_UUID.to_string(),
                    class_id: COLD_CHAIN_EQUIPMENT_UUID.to_string(),
                    code: "G1".to_string(),
                    manufacturer: Some("Fisher & Paykel".to_string()),
                    model: "Kelvinator".to_string(),
                    type_id: REFRIGERATORS_UUID.to_string(),
                    properties: None,
                }, // Fridge
            )
            .unwrap();

        // 2. Check we can't create an asset with the same id
        assert_eq!(
            service.insert_asset_catalogue_item(
                &ctx,
                InsertAssetCatalogueItem {
                    id: id.clone(),
                    sub_catalogue: "General".to_string(),
                    category_id: "REFRIGERATORS_AND_FREEZERS_UUID".to_string(),
                    class_id: COLD_CHAIN_EQUIPMENT_UUID.to_string(),
                    code: "G1".to_string(),
                    manufacturer: Some("Fisher & Paykel".to_string()),
                    model: "Kelvinator".to_string(),
                    type_id: REFRIGERATORS_UUID.to_string(),
                    properties: None
                },
            ),
            Err(InsertAssetCatalogueItemError::ItemAlreadyExists)
        );

        // 3. Check we can't create an asset_catalogue_item with the same code
        assert_eq!(
            service.insert_asset_catalogue_item(
                &ctx,
                InsertAssetCatalogueItem {
                    id: "new_id".to_string(),
                    sub_catalogue: "General".to_string(),
                    category_id: REFRIGERATORS_AND_FREEZERS_UUID.to_string(),
                    class_id: COLD_CHAIN_EQUIPMENT_UUID.to_string(),
                    code: "G1".to_string(),
                    manufacturer: Some("Fisher & Paykel".to_string()),
                    model: "Kelvinator".to_string(),
                    type_id: REFRIGERATORS_UUID.to_string(),
                    properties: None
                },
            ),
            Err(InsertAssetCatalogueItemError::CodeAlreadyExists)
        );

        // 4. Check we can't create an asset_catalogue_item with the manufacturer and model
        assert_eq!(
            service.insert_asset_catalogue_item(
                &ctx,
                InsertAssetCatalogueItem {
                    id: "new_id".to_string(),
                    sub_catalogue: "General".to_string(),
                    category_id: REFRIGERATORS_AND_FREEZERS_UUID.to_string(),
                    class_id: COLD_CHAIN_EQUIPMENT_UUID.to_string(),
                    code: "NewCode".to_string(),
                    manufacturer: Some("Fisher & Paykel".to_string()),
                    model: "Kelvinator".to_string(),
                    type_id: REFRIGERATORS_UUID.to_string(),
                    properties: None
                },
            ),
            Err(InsertAssetCatalogueItemError::ManufacturerAndModelAlreadyExist)
        );
    }
}
