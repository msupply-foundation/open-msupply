use crate::{
    processors::transfer::invoice::test::InvoiceTransferTester,
    sync::test::integration::transfer::{new_instance_of_existing_site, sync_and_delay},
};

use super::{initialise_transfer_sites, SyncIntegrationTransferContext};

#[actix_rt::test]
async fn integration_sync_return_transfers_normal() {
    // util::init_logger(util::LogLevel::Info);

    let SyncIntegrationTransferContext {
        site_1: site_receiving_return,
        site_2: returning_site,
        site_1_processors_task: site_receiving_return_processors_task,
        site_2_processors_task: returning_site_processors_task,
        item1,
        item2,
        service_item,
    } = initialise_transfer_sites("sync_return_transfers_normal").await;

    let test = async move {
        let mut tester = InvoiceTransferTester::new(
            &site_receiving_return.store,
            &returning_site.store,
            None,
            None,
            &item1,
            &item2,
            &service_item,
        );

        // SETUP FOR RETURN
        log::info!(
            "Inserting request requisition on site {:?}",
            returning_site.config
        );
        tester
            .insert_request_requisition(&returning_site.service_provider)
            .await;

        sync_and_delay(&returning_site, &site_receiving_return).await;

        log::info!(
            "Checking response requisition is created on site {:?}",
            site_receiving_return.config
        );
        tester.check_response_requisition_created(&site_receiving_return.connection);

        log::info!(
            "Inserting outbound shipment on site {:?}",
            site_receiving_return.config
        );
        tester.insert_outbound_shipment(&site_receiving_return.connection);

        log::info!(
            "Updating outbound shipment to picked on site {:?}",
            site_receiving_return.config
        );
        tester.update_outbound_shipment_to_picked(&site_receiving_return.service_provider);

        sync_and_delay(&site_receiving_return, &returning_site).await;

        log::info!(
            "Checking inbound shipment is created on site {:?}",
            returning_site.config
        );
        tester.check_inbound_shipment_created(&returning_site.connection);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        // RETURN
        log::info!(
            "Inserting supplier return on site {:?}",
            returning_site.config
        );
        tester.insert_supplier_return(&returning_site.connection);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        log::info!(
            "Checking customer return is not created on site {:?}",
            site_receiving_return.config
        );
        tester.check_customer_return_not_created(&site_receiving_return.connection);

        log::info!(
            "Updating supplier return to picked on site {:?}",
            returning_site.config
        );
        tester.update_supplier_return_to_picked(&returning_site.service_provider);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        log::info!(
            "Checking customer return is created on site {:?}",
            site_receiving_return.config
        );
        tester.check_customer_return_created(&site_receiving_return.connection);

        sync_and_delay(&site_receiving_return, &returning_site).await;

        log::info!(
            "Checking supplier return was linked on site {:?}",
            returning_site.config
        );

        tester.check_supplier_return_was_linked(&returning_site.connection);

        log::info!(
            "Update supplier return line on site {:?}",
            returning_site.config
        );

        tester.update_supplier_return_line(&returning_site.service_provider);

        log::info!(
            "Update supplier return to shipped on site {:?}",
            returning_site.config
        );

        tester.update_supplier_return_to_shipped(&returning_site.service_provider);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        log::info!(
            "Checking customer return was updated on site {:?}",
            site_receiving_return.config
        );
        tester.check_customer_return_was_updated(&site_receiving_return.connection);

        log::info!(
            "Update customer return to delivered on site {:?}",
            site_receiving_return.config
        );
        tester.update_customer_return_to_delivered(&site_receiving_return.service_provider);

        sync_and_delay(&site_receiving_return, &returning_site).await;

        log::info!(
            "Check supplier return status was update on site {:?}",
            returning_site.config
        );
        tester.check_supplier_return_status_matches_customer_return(&returning_site.connection);

        log::info!(
            "Update customer return to verified on site {:?}",
            site_receiving_return.config
        );
        tester.update_customer_return_to_verified(&site_receiving_return.service_provider);

        sync_and_delay(&site_receiving_return, &returning_site).await;

        log::info!(
            "Check supplier return status was update on site {:?}",
            returning_site.config
        );
        tester.check_supplier_return_status_matches_customer_return(&returning_site.connection);
    };

    tokio::select! {
        Err(err) = site_receiving_return_processors_task => unreachable!("{}", err),
        Err(err) = returning_site_processors_task => unreachable!("{}", err),
        _ = test => (),
    };
}

#[actix_rt::test]
async fn integration_sync_return_transfers_delete() {
    // util::init_logger(util::LogLevel::Info);

    let SyncIntegrationTransferContext {
        site_1: site_receiving_return,
        site_2: returning_site,
        site_1_processors_task: site_receiving_return_processors_task,
        site_2_processors_task: returning_site_processors_task,
        item1,
        item2,
        service_item,
    } = initialise_transfer_sites("return_transfers_delete").await;

    let test = async move {
        let mut tester = InvoiceTransferTester::new(
            &site_receiving_return.store,
            &returning_site.store,
            None,
            None,
            &item1,
            &item2,
            &service_item,
        );

        // SETUP FOR RETURN
        log::info!(
            "Inserting request requisition on site {:?}",
            returning_site.config
        );
        tester
            .insert_request_requisition(&returning_site.service_provider)
            .await;

        sync_and_delay(&returning_site, &site_receiving_return).await;

        log::info!(
            "Checking response requisition is created on site {:?}",
            site_receiving_return.config
        );
        tester.check_response_requisition_created(&site_receiving_return.connection);

        log::info!(
            "Inserting outbound shipment on site {:?}",
            site_receiving_return.config
        );
        tester.insert_outbound_shipment(&site_receiving_return.connection);

        log::info!(
            "Updating outbound shipment to picked on site {:?}",
            site_receiving_return.config
        );
        tester.update_outbound_shipment_to_picked(&site_receiving_return.service_provider);

        sync_and_delay(&site_receiving_return, &returning_site).await;

        log::info!(
            "Checking inbound shipment is created on site {:?}",
            returning_site.config
        );
        tester.check_inbound_shipment_created(&returning_site.connection);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        // RETURN
        log::info!(
            "Inserting supplier return on site {:?}",
            returning_site.config
        );
        tester.insert_supplier_return(&returning_site.connection);

        log::info!(
            "Updating supplier return to picked on site {:?}",
            returning_site.config
        );
        tester.update_supplier_return_to_picked(&returning_site.service_provider);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        log::info!(
            "Checking customer return is created on site {:?}",
            site_receiving_return.config
        );
        tester.check_customer_return_created(&site_receiving_return.connection);

        log::info!("Delete supplier return on site {:?}", returning_site.config);

        tester.delete_supplier_return(&returning_site.service_provider);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        log::info!(
            "Check customer return delete {:?}",
            site_receiving_return.config
        );

        tester.check_customer_return_deleted(&site_receiving_return.connection);
    };

    tokio::select! {
        Err(err) = site_receiving_return_processors_task => unreachable!("{}", err),
        Err(err) = returning_site_processors_task => unreachable!("{}", err),
        _ = test => (),
    };
}

#[actix_rt::test]
async fn integration_sync_return_transfers_initialise() {
    // util::init_logger(util::LogLevel::Info);
    let identifier = "return_transfers_initialise";

    let SyncIntegrationTransferContext {
        site_1: site_receiving_return,
        site_2: returning_site,
        site_1_processors_task: site_receiving_return_processors_task,
        site_2_processors_task: returning_site_processors_task,
        item1,
        item2,
        service_item,
    } = initialise_transfer_sites(identifier).await;

    let test = async move {
        let mut tester = InvoiceTransferTester::new(
            &site_receiving_return.store,
            &returning_site.store,
            None,
            None,
            &item1,
            &item2,
            &service_item,
        );

        // SETUP FOR RETURN
        log::info!(
            "Inserting request requisition on site {:?}",
            returning_site.config
        );
        tester
            .insert_request_requisition(&returning_site.service_provider)
            .await;

        sync_and_delay(&returning_site, &site_receiving_return).await;

        log::info!(
            "Checking response requisition is created on site {:?}",
            site_receiving_return.config
        );
        tester.check_response_requisition_created(&site_receiving_return.connection);

        log::info!(
            "Inserting outbound shipment on site {:?}",
            site_receiving_return.config
        );
        tester.insert_outbound_shipment(&site_receiving_return.connection);

        log::info!(
            "Updating outbound shipment to picked on site {:?}",
            site_receiving_return.config
        );
        tester.update_outbound_shipment_to_picked(&site_receiving_return.service_provider);

        sync_and_delay(&site_receiving_return, &returning_site).await;

        log::info!(
            "Checking inbound shipment is created on site {:?}",
            returning_site.config
        );
        tester.check_inbound_shipment_created(&returning_site.connection);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        // RETURN
        log::info!(
            "Inserting supplier return on site {:?}",
            returning_site.config
        );
        tester.insert_supplier_return(&returning_site.connection);

        log::info!(
            "Updating supplier return to picked on site {:?}",
            returning_site.config
        );
        tester.update_supplier_return_to_picked(&returning_site.service_provider);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        (tester, site_receiving_return)
    };

    let (mut tester, site_receiving_return) = tokio::select! {
        Err(err) = site_receiving_return_processors_task => unreachable!("{}", err),
        Err(err) = returning_site_processors_task => unreachable!("{}", err),
        test_result = test => test_result,
    };
    // Since this test check transfers are forward on initialisation, we want to re-set database for site_receiving_return
    let (site_receiving_return, site_receiving_return_processors_task) =
        new_instance_of_existing_site(site_receiving_return, &format!("{}_site1_2", identifier))
            .await;

    let test = async move {
        // Site 1 should be re-initialised here
        sync_and_delay(&site_receiving_return, &site_receiving_return).await;
        log::info!(
            "Checking customer return is created on site {:?}",
            site_receiving_return.config
        );
        tester.check_customer_return_created(&site_receiving_return.connection);
    };

    tokio::select! {
        Err(err) = site_receiving_return_processors_task => unreachable!("{}", err),
        _ = test => (),
    };
}
