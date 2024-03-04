#[cfg(test)]

mod query {
    use crate::{
        asset::insert_log::{InsertAssetLog, InsertAssetLogError},
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{mock_asset_a, MockDataInserts},
        test_db::setup_all,
    };

    #[actix_rt::test]

    async fn asset_log_service_insert() {
        let (_, _connection, connection_manager, _) =
            setup_all("asset_log_service_insert", MockDataInserts::none().assets()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let ctx = service_provider
            .context(mock_asset_a().id, "".to_string())
            .unwrap();
        let service = service_provider.asset_service;

        // check we can create an asset_lod
        let id = "test_id".to_string();
        let asset_log = service
            .insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: id.clone(),
                    asset_id: mock_asset_a().id,
                    status: Some("test_status".to_string()),
                },
            )
            .unwrap();

        assert_eq!(asset_log.id, id);

        // attempt to create asset with duplicate id
        assert_eq!(
            service.insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: id.clone(),
                    asset_id: mock_asset_a().id,
                    status: Some("test_status".to_string()),
                },
            ),
            Err(InsertAssetLogError::AssetLogAlreadyExists)
        );

        // attempt to create asset with incorrect asset_id
        assert_eq!(
            service.insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: "test_id_2".to_string(),
                    asset_id: "incorrect_asset_id".to_string(),
                    status: Some("test_status".to_string()),
                },
            ),
            Err(InsertAssetLogError::AssetLogAlreadyExists)
        )
    }
}
