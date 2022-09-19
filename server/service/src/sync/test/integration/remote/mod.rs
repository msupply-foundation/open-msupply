pub(crate) mod invoice;
pub(crate) mod location;
pub(crate) mod number;
pub(crate) mod requisition;
pub(crate) mod stock_line;
pub(crate) mod stocktake;
mod test;

use crate::sync::test::{
    check_records_against_database,
    integration::{
        central_server_configurations::{ConfigureCentralServer, SiteConfiguration},
        init_test_context, SyncIntegrationContext,
    },
};

use super::SyncRecordTester;

/// For each test step:
/// Upsert data to database
/// Push changes to central server
/// Reinitilises from cenral server with a fresh database
/// Check that pulled data matches previously upserted data
async fn test_remote_sync_record(identifier: &str, tester: &dyn SyncRecordTester) {
    // util::init_logger(util::LogLevel::Info);
    println!("test_remote_sync_record_{}_init", identifier);

    let central_server_configurations = ConfigureCentralServer::from_env();
    let SiteConfiguration {
        new_site_properties,
        sync_settings,
    } = central_server_configurations
        .create_sync_site(vec![])
        .await
        .expect("Problem creating sync site");

    let SyncIntegrationContext {
        connection,
        synchroniser,
        ..
    } = init_test_context(&sync_settings, &identifier).await;
    let steps_data = tester.test_step_data(&new_site_properties);

    let mut previous_connection = connection;
    let mut previous_synchroniser = synchroniser;

    for (index, step_data) in steps_data.into_iter().enumerate() {
        let inner_identifier = format!("{}_step_{}", identifier, index + 1);
        println!("test_remote_sync_record_{}", inner_identifier);

        central_server_configurations
            .upsert_records(step_data.central_upsert)
            .await
            .expect("Problem inserting central data");

        central_server_configurations
            .delete_records(step_data.central_delete)
            .await
            .expect("Problem deleting central data");

        // Pull required central data
        previous_synchroniser.sync().await.unwrap();
        // Integrate
        step_data
            .integration_records
            .integrate(&previous_connection)
            .unwrap();
        // Push integrated changes
        previous_synchroniser.sync().await.unwrap();
        // Re initialise
        let SyncIntegrationContext {
            connection,
            synchroniser,
            ..
        } = init_test_context(&sync_settings, &inner_identifier).await;
        previous_connection = connection;
        previous_synchroniser = synchroniser;
        previous_synchroniser.sync().await.unwrap();
        // Confirm records have synced back correctly
        check_records_against_database(&previous_connection, step_data.integration_records).await;
    }
}
