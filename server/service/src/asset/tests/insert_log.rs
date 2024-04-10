#[cfg(test)]
mod query {
    use crate::{
        asset::{
            insert_log::{InsertAssetLog, InsertAssetLogError},
            insert_log_reason::InsertAssetLogReason,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        asset_log_row::AssetLogStatus,
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
        let id2 = "test_id_2".to_string();
        let asset_log = service
            .insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: id.clone(),
                    asset_id: mock_asset_a().id,
                    status: Some(AssetLogStatus::Functioning),
                    comment: None,
                    r#type: None,
                    reason_id: None,
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
                    reason_id: None,
                },
            ),
            Err(InsertAssetLogError::AssetLogAlreadyExists)
        );

        // attempt to create asset with incorrect asset_id
        assert_eq!(
            service.insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: id2.clone(),
                    asset_id: "incorrect_asset_id".to_string(),
                    status: Some(AssetLogStatus::Functioning),
                    comment: None,
                    r#type: None,
                    reason_id: None,
                },
            ),
            Err(InsertAssetLogError::AssetDoesNotExist)
        );

        // insert new asset log reason

        let reason = service
            .insert_asset_log_reason(
                &ctx,
                InsertAssetLogReason {
                    id: "test_reason_id".to_string(),
                    asset_log_status: AssetLogStatus::NotFunctioning,
                    reason: "unknown error".to_string(),
                },
            )
            .unwrap();

        assert_eq!(reason.id, "test_reason_id");

        // Check adding log with reason but no status fails
        assert_eq!(
            service.insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: id2.clone(),
                    asset_id: mock_asset_a().id,
                    status: None,
                    comment: None,
                    r#type: None,
                    reason_id: Some("test_reason_id".to_string()),
                },
            ),
            Err(InsertAssetLogError::ReasonInvalidForStatus)
        );

        // Check adding log with non matching reason fails
        assert_eq!(
            service.insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: id2.clone(),
                    asset_id: mock_asset_a().id,
                    status: Some(AssetLogStatus::Functioning),
                    comment: None,
                    r#type: None,
                    reason_id: Some("test_reason_id".to_string()),
                },
            ),
            Err(InsertAssetLogError::ReasonInvalidForStatus)
        );

        // Check adding log with wrong reason id fails
        assert_eq!(
            service.insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: id2.clone(),
                    asset_id: mock_asset_a().id,
                    status: Some(AssetLogStatus::NotFunctioning),
                    comment: None,
                    r#type: None,
                    reason_id: Some("non_existant_id".to_string()),
                },
            ),
            Err(InsertAssetLogError::ReasonInvalidForStatus)
        );

        // Check adding log with matching status and reason works
        let asset_log = service
            .insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: id2.clone(),
                    asset_id: mock_asset_a().id,
                    status: Some(AssetLogStatus::NotFunctioning),
                    comment: None,
                    r#type: None,
                    reason_id: Some("test_reason_id".to_string()),
                },
            )
            .unwrap();

        assert_eq!(asset_log.id, id2);
    }
}
