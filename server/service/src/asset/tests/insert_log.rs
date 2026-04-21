#[cfg(test)]
mod query {
    use crate::{
        asset::{
            insert_log::{InsertAssetLog, InsertAssetLogError},
            insert_log_reason::InsertAssetLogReason,
        },
        service_provider::ServiceProvider,
    };
    use chrono::{Duration, Utc};
    use repository::{
        asset_log_row::{AssetLogStatus, AssetLogType},
        assets::asset_row::AssetRowRepository,
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

        let service_provider = ServiceProvider::new(connection_manager);
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
                    log_datetime: None,
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
                    log_datetime: None,
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
                    log_datetime: None,
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
                    comments_required: false,
                },
            )
            .unwrap();

        assert_eq!(reason.id, "test_reason_id");

        // Check status null
        assert_eq!(
            service.insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: id2.clone(),
                    asset_id: mock_asset_a().id,
                    status: None,
                    comment: None,
                    r#type: None,
                    reason_id: None,
                    log_datetime: None,
                },
            ),
            Err(InsertAssetLogError::StatusNotProvided)
        );

        // Check adding log with reason but no status fails
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
                    log_datetime: None,
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
                    log_datetime: None,
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
                    log_datetime: None,
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
                    log_datetime: None,
                },
            )
            .unwrap();

        assert_eq!(asset_log.id, id2);

        // Check NotFunctioning status without reason fails
        assert_eq!(
            service.insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: "test_no_reason".to_string(),
                    asset_id: mock_asset_a().id,
                    status: Some(AssetLogStatus::NotFunctioning),
                    comment: None,
                    r#type: None,
                    reason_id: None,
                    log_datetime: None,
                },
            ),
            Err(InsertAssetLogError::ReasonInvalidForStatus)
        );

        // Check adding log with comments_required reason but no comment fails
        let reason_with_comments = service
            .insert_asset_log_reason(
                &ctx,
                InsertAssetLogReason {
                    id: "test_reason_with_comments".to_string(),
                    asset_log_status: AssetLogStatus::NotFunctioning,
                    reason: "requires comment".to_string(),
                    comments_required: true,
                },
            )
            .unwrap();

        assert_eq!(reason_with_comments.id, "test_reason_with_comments");

        // Should fail without comment
        assert_eq!(
            service.insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: "test_id_3".to_string(),
                    asset_id: mock_asset_a().id,
                    status: Some(AssetLogStatus::NotFunctioning),
                    comment: None,
                    r#type: None,
                    reason_id: Some("test_reason_with_comments".to_string()),
                    log_datetime: None,
                },
            ),
            Err(InsertAssetLogError::CommentRequiredForReason)
        );

        // Should fail with empty comment
        assert_eq!(
            service.insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: "test_id_3".to_string(),
                    asset_id: mock_asset_a().id,
                    status: Some(AssetLogStatus::NotFunctioning),
                    comment: Some("   ".to_string()),
                    r#type: None,
                    reason_id: Some("test_reason_with_comments".to_string()),
                    log_datetime: None,
                },
            ),
            Err(InsertAssetLogError::CommentRequiredForReason)
        );

        // Should succeed with valid comment
        let asset_log = service
            .insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: "test_id_3".to_string(),
                    asset_id: mock_asset_a().id,
                    status: Some(AssetLogStatus::NotFunctioning),
                    comment: Some("This is a valid comment".to_string()),
                    r#type: None,
                    reason_id: Some("test_reason_with_comments".to_string()),
                    log_datetime: None,
                },
            )
            .unwrap();

        assert_eq!(asset_log.id, "test_id_3");
    }

    #[actix_rt::test]
    async fn asset_log_future_log_datetime_rejected() {
        let (_, _connection, connection_manager, _) = setup_all(
            "asset_log_future_log_datetime_rejected",
            MockDataInserts::none().user_accounts().assets(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.asset_service;

        let future_datetime = Utc::now() + Duration::hours(1);

        assert_eq!(
            service.insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: "future_log".to_string(),
                    asset_id: mock_asset_a().id,
                    status: Some(AssetLogStatus::Functioning),
                    comment: None,
                    r#type: None,
                    reason_id: None,
                    log_datetime: Some(future_datetime),
                },
            ),
            Err(InsertAssetLogError::LogDatetimeInFuture)
        );

        // Past datetime should succeed
        let past_datetime = Utc::now() - Duration::hours(1);
        let asset_log = service
            .insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: "past_log".to_string(),
                    asset_id: mock_asset_a().id,
                    status: Some(AssetLogStatus::Functioning),
                    comment: None,
                    r#type: None,
                    reason_id: None,
                    log_datetime: Some(past_datetime),
                },
            )
            .unwrap();

        assert_eq!(asset_log.id, "past_log");
        // log_datetime should be the provided value, not now
        assert!(
            (asset_log.log_datetime - past_datetime.naive_utc()).num_seconds().abs() < 2,
            "log_datetime should match the provided past datetime"
        );
        // created_datetime should be close to now, not the backdated log_datetime
        assert!(
            (Utc::now().naive_utc() - asset_log.created_datetime)
                .num_seconds()
                .abs()
                < 5,
            "created_datetime should be close to now"
        );
    }

    #[actix_rt::test]
    async fn asset_log_event_type_without_status() {
        let (_, _connection, connection_manager, _) = setup_all(
            "asset_log_event_type_without_status",
            MockDataInserts::none().user_accounts().assets(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.asset_service;

        // Type provided without status should succeed
        let asset_log = service
            .insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: "event_type_log".to_string(),
                    asset_id: mock_asset_a().id,
                    status: None,
                    comment: None,
                    r#type: Some(AssetLogType::TemperatureMapping),
                    reason_id: None,
                    log_datetime: Some(Utc::now() - Duration::hours(1)),
                },
            )
            .unwrap();

        assert_eq!(asset_log.id, "event_type_log");
        assert_eq!(asset_log.r#type, Some(AssetLogType::TemperatureMapping));
        assert_eq!(asset_log.status, None);
    }

    #[actix_rt::test]
    async fn asset_log_recalculate_mapping_dates() {
        let (_, connection, connection_manager, _) = setup_all(
            "asset_log_recalculate_mapping_dates",
            MockDataInserts::none().user_accounts().assets(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let ctx = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.asset_service;
        let asset_id = mock_asset_a().id;

        let earlier_date = Utc::now() - Duration::days(30);
        let later_date = Utc::now() - Duration::days(5);

        // Insert first mapping log
        service
            .insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: "mapping_log_1".to_string(),
                    asset_id: asset_id.clone(),
                    status: None,
                    comment: None,
                    r#type: Some(AssetLogType::TemperatureMapping),
                    reason_id: None,
                    log_datetime: Some(earlier_date),
                },
            )
            .unwrap();

        // After one mapping log, both dates should be the same
        let asset_row = AssetRowRepository::new(&connection)
            .find_one_by_id(&asset_id)
            .unwrap()
            .unwrap();
        let properties: serde_json::Map<String, serde_json::Value> =
            serde_json::from_str(asset_row.properties.as_deref().unwrap()).unwrap();

        let expected_earlier = earlier_date.naive_utc().format("%Y-%m-%d").to_string();
        assert_eq!(
            properties.get("initial_mapping_date").unwrap(),
            &serde_json::Value::String(expected_earlier.clone())
        );
        assert_eq!(
            properties.get("most_recent_mapping_date").unwrap(),
            &serde_json::Value::String(expected_earlier)
        );

        // Insert second mapping log with a later date
        service
            .insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: "mapping_log_2".to_string(),
                    asset_id: asset_id.clone(),
                    status: None,
                    comment: None,
                    r#type: Some(AssetLogType::TemperatureMapping),
                    reason_id: None,
                    log_datetime: Some(later_date),
                },
            )
            .unwrap();

        // Now initial should be earlier, most_recent should be later
        let asset_row = AssetRowRepository::new(&connection)
            .find_one_by_id(&asset_id)
            .unwrap()
            .unwrap();
        let properties: serde_json::Map<String, serde_json::Value> =
            serde_json::from_str(asset_row.properties.as_deref().unwrap()).unwrap();

        let expected_earlier = earlier_date.naive_utc().format("%Y-%m-%d").to_string();
        let expected_later = later_date.naive_utc().format("%Y-%m-%d").to_string();
        assert_eq!(
            properties.get("initial_mapping_date").unwrap(),
            &serde_json::Value::String(expected_earlier.clone())
        );
        assert_eq!(
            properties.get("most_recent_mapping_date").unwrap(),
            &serde_json::Value::String(expected_later.clone())
        );

        // Non-mapping log should not affect mapping dates
        service
            .insert_asset_log(
                &ctx,
                InsertAssetLog {
                    id: "status_log".to_string(),
                    asset_id: asset_id.clone(),
                    status: Some(AssetLogStatus::Functioning),
                    comment: None,
                    r#type: None,
                    reason_id: None,
                    log_datetime: None,
                },
            )
            .unwrap();

        let asset_row = AssetRowRepository::new(&connection)
            .find_one_by_id(&asset_id)
            .unwrap()
            .unwrap();
        let properties: serde_json::Map<String, serde_json::Value> =
            serde_json::from_str(asset_row.properties.as_deref().unwrap()).unwrap();

        // Mapping dates should be unchanged
        assert_eq!(
            properties.get("initial_mapping_date").unwrap(),
            &serde_json::Value::String(expected_earlier)
        );
        assert_eq!(
            properties.get("most_recent_mapping_date").unwrap(),
            &serde_json::Value::String(expected_later)
        );
    }
}
