#[cfg(test)]
mod query {
    use crate::{
        asset::insert_log::{InsertAssetLog, InsertAssetLogError},
        service_provider::ServiceProvider,
    };
    use repository::{
        asset_log_row::{AssetLogReason, AssetLogStatus},
        mock::{mock_asset_a, mock_store_a, mock_user_account_a, MockDataInserts},
        test_db::setup_all,
    };

    #[actix_rt::test]

    async fn asset_log_service_insert() {
        let (_, _connection, connection_manager, _) = setup_all(
            "asset_log_service_insert",
            MockDataInserts::none().user_accounts().assets(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let ctx = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.asset_service;

        // check we can create an asset_log
        let id = "test_id".to_string();
        let asset_log = service
            .insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: id.clone(),
                    asset_id: mock_asset_a().id,
                    status: Some(AssetLogStatus::Functioning),
                    comment: None,
                    r#type: None,
                    reason: None,
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
                    status: Some(AssetLogStatus::Functioning),
                    comment: None,
                    r#type: None,
                    reason: None,
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
                    status: Some(AssetLogStatus::Functioning),
                    comment: None,
                    r#type: None,
                    reason: None,
                },
            ),
            Err(InsertAssetLogError::AssetDoesNotExist)
        );

        // Insert log where status matches reason
        let id = "test_id_3".to_string();
        let asset_log = service
            .insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: id.clone(),
                    asset_id: mock_asset_a().id,
                    status: Some(AssetLogStatus::FunctioningButNeedsAttention),
                    comment: None,
                    r#type: None,
                    reason: Some(AssetLogReason::NeedsServicing),
                },
            )
            .unwrap();

        assert_eq!(asset_log.id, id);

        // Insert log where status does not match reason
        assert_eq!(
            service.insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: "test_id_4".to_string(),
                    asset_id: "incorrect_asset_id".to_string(),
                    status: Some(AssetLogStatus::FunctioningButNeedsAttention),
                    comment: None,
                    r#type: None,
                    reason: Some(AssetLogReason::Stored),
                },
            ),
            Err(InsertAssetLogError::ReasonInvalidForStatus)
        );
    }
}
