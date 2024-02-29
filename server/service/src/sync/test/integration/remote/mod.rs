pub(crate) mod activity_log;
pub(crate) mod clinician;
pub(crate) mod document;
pub(crate) mod invoice;
pub(crate) mod location;
pub(crate) mod location_movement;
pub(crate) mod patient_name_and_store_and_name_store_join;
pub(crate) mod program_requisition;
pub(crate) mod requisition;
pub(crate) mod stock_line;
pub(crate) mod stocktake;
mod test;
pub(crate) mod user_permission;

use repository::{ChangelogRepository, InvoiceRowType, NameRowRepository, StorageConnection};
use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;

use crate::sync::{
    test::{
        check_records_against_database,
        integration::{
            central_server_configurations::{ConfigureCentralServer, SiteConfiguration},
            init_test_context, SyncIntegrationContext,
        },
    },
    translations::{IntegrationRecords, PullUpsertRecord},
};

use super::SyncRecordTester;

/// For each test step:
/// Upsert data to database
/// Push changes to central server
/// Reinitialises from central server with a fresh database
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

        let mut integration_records = step_data.integration_records;
        // Replace system name codes (for inventory adjustment name etc..)
        replace_system_name_ids(&mut integration_records, &previous_connection);

        // Integrate
        {
            let changelog_repo = ChangelogRepository::new(&previous_connection);
            let cursor = changelog_repo.latest_cursor().unwrap();
            integration_records.integrate(&previous_connection).unwrap();
            // Need to reset is_sync_update since we've inserted test data with sync methods
            // they need to sync to central (if is_sync_update is set to true they will not sync to central)
            changelog_repo.reset_is_sync_update(cursor).unwrap();
        } // Extra scope is needed to drop changelog_repo since it has ref to mutable previous_connection
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
        check_records_against_database(&previous_connection, integration_records).await;
    }
}

fn replace_system_name_ids(records: &mut IntegrationRecords, connection: &StorageConnection) {
    let inventory_adjustment_name = NameRowRepository::new(connection)
        .find_one_by_code(INVENTORY_ADJUSTMENT_NAME_CODE)
        .unwrap()
        .expect("Cannot find inventory adjustment name");

    for mut record in records.upserts.iter_mut() {
        if let PullUpsertRecord::Invoice(invoice) = &mut record {
            if invoice.r#type == InvoiceRowType::InventoryAddition
                || invoice.r#type == InvoiceRowType::InventoryReduction
            {
                invoice.name_link_id = inventory_adjustment_name.id.clone();
                invoice.name_store_id = None;
            }
        }
    }
}
