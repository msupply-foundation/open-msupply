mod currency;
mod document_registry;
mod form_schema;
mod inventory_adjustment_reason;
mod master_list;
mod name_and_store_and_name_store_join;
mod period_schedule_and_period;
mod test;
mod unit_and_item;

use super::{central_server_configurations::ConfigureCentralServer, SyncRecordTester};
use crate::sync::test::{
    check_integrated,
    integration::{create_site, init_test_context},
};

/// Updates central server with data specified from each step of tester
/// Synchronises after each step and checks against step data
///
/// Do update for each step and re-initialise and check against the step data

async fn test_central_sync_record(identifier: &str, tester: &dyn SyncRecordTester) {
    // util::init_logger(util::LogLevel::Info);
    // Without re-initialisation
    println!("test_central_sync_record_{}_init", identifier);

    let central_server_configurations = ConfigureCentralServer::from_env();
    let mut site_config = create_site(identifier, vec![]).await;

    let steps_data = tester.test_step_data(&site_config.config.new_site_properties);

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

        site_config.synchroniser.sync(None).await.unwrap();
        check_integrated(
            &site_config.context.connection,
            &step_data.integration_records,
        )
    }

    // With re-initialisation
    let identifier = format!("with_reinit_{}", identifier);
    println!("test_central_sync_record_{}_init", identifier);

    let central_server_configurations = ConfigureCentralServer::from_env();
    site_config = create_site(&identifier, vec![]).await;

    let steps_data = tester.test_step_data(&site_config.config.new_site_properties);

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

        site_config = init_test_context(site_config.config, &inner_identifier).await;

        site_config.synchroniser.sync(None).await.unwrap();

        check_integrated(
            &site_config.context.connection,
            &step_data.integration_records,
        )
    }
}
