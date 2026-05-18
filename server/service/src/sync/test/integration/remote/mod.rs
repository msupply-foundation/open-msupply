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

use repository::{InvoiceRow, InvoiceType, NameRowRepository, StorageConnection};
use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;

use crate::sync::{
    test::{
        check_integrated,
        integration::{
            central_server_configurations::ConfigureCentralServer, create_site, init_test_context,
            integrate_with_is_sync_reset,
        },
    },
    translations::IntegrationOperation,
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

    let mut site_config = create_site(identifier, vec![]).await;

    let steps_data = tester.test_step_data(&site_config.config.new_site_properties);

    let mut previous_connection = site_config.context.connection;
    let mut previous_synchroniser = site_config.synchroniser;

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
        previous_synchroniser.sync(None).await.unwrap();

        let mut integration_records = step_data.integration_records;
        // Replace system name codes (for inventory adjustment name etc..)
        replace_system_name_ids(&mut integration_records, &previous_connection);

        // Integrate
        let integration_records =
            integrate_with_is_sync_reset(&previous_connection, integration_records);
        // Push integrated changes
        previous_synchroniser.sync(None).await.unwrap();
        // Re initialise
        site_config = init_test_context(site_config.config, &inner_identifier).await;
        previous_connection = site_config.context.connection;
        previous_synchroniser = site_config.synchroniser;
        previous_synchroniser.sync(None).await.unwrap();

        // Confirm records have synced back correctly
        check_integrated(&previous_connection, &integration_records)
    }
}

fn replace_system_name_ids(
    records: &mut Vec<IntegrationOperation>,
    connection: &StorageConnection,
) {
    let inventory_adjustment_name = NameRowRepository::new(connection)
        .find_one_by_code(INVENTORY_ADJUSTMENT_NAME_CODE)
        .unwrap()
        .expect("Cannot find inventory adjustment name");

    for record in records {
        let IntegrationOperation::Upsert(record) = record else {
            continue;
        };

        let Some(mut_invoice) = record
            .as_mut_any()
            .and_then(|any| any.downcast_mut::<InvoiceRow>())
        else {
            continue;
        };

        if mut_invoice.r#type == InvoiceType::InventoryAddition
            || mut_invoice.r#type == InvoiceType::InventoryReduction
        {
            mut_invoice.name_id = inventory_adjustment_name.id.clone();
            mut_invoice.name_store_id = None;
        }
    }
}
