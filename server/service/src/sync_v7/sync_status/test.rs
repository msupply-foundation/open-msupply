use crate::{
    sync::settings::SyncSettings,
    sync::sync_status::status::InitialisationStatus,
    test_helpers::{setup_all_and_service_provider, ServiceTestContext},
};
use chrono::Utc;
use repository::{
    mock::{insert_extra_mock_data, MockData, MockDataInserts},
    syncv7::SyncError,
    SyncLogV7Row,
};
use util::assert_matches;

#[actix_rt::test]
async fn sync_status_v7() {
    let ServiceTestContext {
        connection,
        service_provider,
        service_context,
        ..
    } = setup_all_and_service_provider("sync_status_v7", MockDataInserts::none()).await;

    let service = &service_provider.sync_status_v7_service;

    // Empty table
    assert_eq!(
        service.get_initialisation_status_v7(&service_context),
        Ok(InitialisationStatus::PreInitialisation)
    );
    assert!(service
        .get_latest_sync_status_v7(&service_context)
        .unwrap()
        .is_none());

    // Sync started — in progress
    insert_extra_mock_data(
        &connection,
        MockData {
            sync_logs_v7: vec![SyncLogV7Row {
                id: "1".to_string(),
                started_datetime: Utc::now().naive_local(),
                ..Default::default()
            }],
            ..Default::default()
        },
    );

    let status = service
        .get_latest_sync_status_v7(&service_context)
        .unwrap()
        .unwrap();
    assert!(status.is_syncing);
    assert_eq!(
        service.get_initialisation_status_v7(&service_context),
        Ok(InitialisationStatus::PreInitialisation)
    );

    // Sync finished with error — not initialised
    insert_extra_mock_data(
        &connection,
        MockData {
            sync_logs_v7: vec![SyncLogV7Row {
                id: "1".to_string(),
                started_datetime: Utc::now().naive_local(),
                finished_datetime: Some(Utc::now().naive_local()),
                error: Some(SyncError::ConnectionError {
                    url: "http://test.com".to_string(),
                    e: "connection refused".to_string(),
                }),
                ..Default::default()
            }],
            ..Default::default()
        },
    );

    let status = service
        .get_latest_sync_status_v7(&service_context)
        .unwrap()
        .unwrap();
    assert!(!status.is_syncing);
    assert!(status.error.is_some());
    assert_eq!(
        service.get_initialisation_status_v7(&service_context),
        Ok(InitialisationStatus::PreInitialisation)
    );
    assert!(service
        .get_latest_successful_sync_status_v7(&service_context)
        .unwrap()
        .is_none());

    // Sync completed successfully — initialised
    insert_extra_mock_data(
        &connection,
        MockData {
            sync_logs_v7: vec![SyncLogV7Row {
                id: "2".to_string(),
                started_datetime: Utc::now().naive_local(),
                finished_datetime: Some(Utc::now().naive_local()),
                ..Default::default()
            }],
            ..Default::default()
        },
    );

    // Need sync settings for Initialised to return site name
    service_provider
        .settings
        .update_sync_settings(
            &service_context,
            &SyncSettings {
                username: "site_name".to_string(),
                url: "http://test.com".to_string(),
                ..SyncSettings::default()
            },
        )
        .unwrap();

    assert_matches!(
        service.get_initialisation_status_v7(&service_context),
        Ok(InitialisationStatus::Initialised(_))
    );
    assert!(service
        .get_latest_successful_sync_status_v7(&service_context)
        .unwrap()
        .is_some());
}
