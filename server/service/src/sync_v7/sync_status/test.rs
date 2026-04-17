use crate::{
    sync::settings::SyncSettings,
    sync::sync_status::status::InitialisationStatus,
    test_helpers::{setup_all_and_service_provider, ServiceTestContext},
};
use chrono::Utc;
use repository::{
    mock::{insert_extra_mock_data, MockData, MockDataInserts},
    SyncLogV7Row,
};
use util::assert_matches;

#[actix_rt::test]
async fn initialisation_status_v7() {
    let ServiceTestContext {
        connection,
        service_provider,
        service_context,
        ..
    } = setup_all_and_service_provider("initialisation_status_v7_new", MockDataInserts::none())
        .await;

    assert_eq!(
        service_provider
            .sync_status_v7_service
            .get_initialisation_status_v7(&service_context),
        Ok(InitialisationStatus::PreInitialisation)
    );

    // Incomplete sync — not initialised
    insert_extra_mock_data(
        &connection,
        MockData {
            sync_logs_v7: vec![SyncLogV7Row {
                id: "1".to_string(),
                ..Default::default()
            }],
            ..Default::default()
        },
    );

    assert_eq!(
        service_provider
            .sync_status_v7_service
            .get_initialisation_status_v7(&service_context),
        Ok(InitialisationStatus::PreInitialisation)
    );

    // Completed sync with error — not initialised
    insert_extra_mock_data(
        &connection,
        MockData {
            sync_logs_v7: vec![SyncLogV7Row {
                id: "2".to_string(),
                finished_datetime: Some(Utc::now().naive_local()),
                error: Some(repository::syncv7::SyncError::Other("error".to_string())),
                ..Default::default()
            }],
            ..Default::default()
        },
    );

    assert_eq!(
        service_provider
            .sync_status_v7_service
            .get_initialisation_status_v7(&service_context),
        Ok(InitialisationStatus::PreInitialisation)
    );

    // Completed sync without error — initialised
    insert_extra_mock_data(
        &connection,
        MockData {
            sync_logs_v7: vec![SyncLogV7Row {
                id: "3".to_string(),
                finished_datetime: Some(Utc::now().naive_local()),
                ..Default::default()
            }],
            ..Default::default()
        },
    );

    // Need to add sync settings so that Initialised returns site name
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
        service_provider
            .sync_status_v7_service
            .get_initialisation_status_v7(&service_context),
        Ok(InitialisationStatus::Initialised(_))
    );
}
