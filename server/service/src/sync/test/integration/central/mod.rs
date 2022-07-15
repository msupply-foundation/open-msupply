mod master_list;
mod name_and_store_and_name_store_join;
mod report;
mod test;
mod unit_and_item;

use util::uuid::uuid;

use super::{central_server_configurations::ConfigureCentralServer, SyncRecordTester};
use crate::sync::test::{
    check_records_against_database,
    integration::{central_server_configurations::CreateSyncSiteResult, init_db},
};

fn small_uuid() -> String {
    uuid().split("-").next().unwrap().to_string()
}

/// Updates central server with data specified from each step of tester
/// Synchronises after each step and checks against step data
///
/// Do update for each step and re-initialise and check against the step data

async fn test_central_sync_record(identifier: &str, tester: &dyn SyncRecordTester) {
    // util::init_logger(util::LogLevel::Info);
    // Without re-initialisation
    println!("test_central_sync_record_{}_init", identifier);

    let central_server_configurations = ConfigureCentralServer::from_env();
    let CreateSyncSiteResult {
        new_site_properties,
        sync_settings,
    } = central_server_configurations
        .create_sync_site()
        .await
        .expect("Problem creating sync site");

    let (connection, synchroniser) = init_db(&sync_settings, &identifier).await;

    let steps_data = tester.test_step_data(&new_site_properties);

    for (index, step_data) in steps_data.into_iter().enumerate() {
        println!("test_central_sync_record_{}_step{}", identifier, index + 1);

        central_server_configurations
            .upsert_records(step_data.central_upsert)
            .await
            .expect("Problem inserting central data");

        central_server_configurations
            .delete_records(step_data.central_delete)
            .await
            .expect("Problem deleting central data");

        synchroniser.sync().await.unwrap();
        check_records_against_database(&connection, step_data.integration_records).await;
    }

    // With re-initialisation
    let identifier = format!("with_reinitialisation_{}", identifier);
    println!("test_central_sync_record_{}_init", identifier);

    let central_server_configurations = ConfigureCentralServer::from_env();
    let CreateSyncSiteResult {
        new_site_properties,
        sync_settings,
    } = central_server_configurations
        .create_sync_site()
        .await
        .expect("Problem creating sync site");

    let steps_data = tester.test_step_data(&new_site_properties);
    for (index, step_data) in steps_data.into_iter().enumerate() {
        let inner_identifier = format!("{}_step_{}", identifier, index + 1);
        println!("test_central_sync_record_{}", inner_identifier);

        central_server_configurations
            .upsert_records(step_data.central_upsert)
            .await
            .expect("Problem inserting central data");

        central_server_configurations
            .delete_records(step_data.central_delete)
            .await
            .expect("Problem deleting central data");

        let (connection, synchroniser) = init_db(&sync_settings, &inner_identifier).await;
        synchroniser.sync().await.unwrap();
        check_records_against_database(&connection, step_data.integration_records).await;
    }
}
