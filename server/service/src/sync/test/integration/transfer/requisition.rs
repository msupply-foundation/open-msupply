use crate::{
    processors::transfer::requisition::test::RequisitionTransferTester,
    sync::test::integration::transfer::{new_instance_of_existing_site, sync_and_delay},
};

use super::{initialise_transfer_sites, SyncIntegrationTransferContext};

#[actix_rt::test]
async fn integration_sync_requisition_transfers_normal() {
    // util::init_logger(util::LogLevel::Info);
    let SyncIntegrationTransferContext {
        site_1: request_site,
        site_2: response_site,
        site_1_processors_task: request_site_processors_task,
        site_2_processors_task: response_site_processors_task,
        item1,
        item2,
        service_item: _,
    } = initialise_transfer_sites("requisition_transfers_normal").await;

    let test = async move {
        let mut tester = RequisitionTransferTester::new(
            &request_site.store,
            &response_site.store,
            &item1,
            &item2,
        );

        log::info!(
            "Inserting request requisition on site {:?}",
            request_site.config
        );
        tester.insert_request_requisition(&request_site.connection);

        sync_and_delay(&request_site, &response_site).await;

        log::info!(
            "Checking response requisition is not created on site {:?}",
            response_site.config
        );
        tester.check_response_requisition_not_created(&response_site.connection);

        log::info!(
            "Updating request requisition to sent status on site {:?}",
            request_site.config
        );
        tester.update_request_requisition_to_sent(&request_site.service_provider);

        sync_and_delay(&request_site, &response_site).await;

        log::info!(
            "Checking response requisition is created on site {:?}",
            response_site.config
        );
        tester.check_response_requisition_created(&response_site.connection);

        sync_and_delay(&response_site, &request_site).await;

        log::info!(
            "Checking that request requisition was linked on site {:?}",
            request_site.config
        );
        tester.check_request_requisition_was_linked(&request_site.connection);

        log::info!(
            "Updating response requisition to finalised on site {:?}",
            response_site.config
        );
        tester.update_response_requisition_to_finalised(&response_site.service_provider);

        sync_and_delay(&response_site, &request_site).await;

        log::info!(
            "Checking request requisition status is updated to finalise on site {:?}",
            request_site.config
        );
        tester.check_request_requisition_status_updated(&request_site.connection);
    };

    tokio::select! {
        Err(err) = request_site_processors_task => unreachable!("{}", err),
        Err(err) = response_site_processors_task => unreachable!("{}", err),
        _ = test => (),
    };
}

#[actix_rt::test]
async fn integration_sync_requisition_transfers_initialisation() {
    // util::init_logger(util::LogLevel::Info);
    let identifier = "requisition_transfers_initialisation";

    let SyncIntegrationTransferContext {
        site_1: request_site,
        site_2: response_site,
        site_1_processors_task: request_site_processors_task,
        site_2_processors_task: response_site_processors_task,
        item1,
        item2,
        service_item: _,
    } = initialise_transfer_sites(identifier).await;

    let test = async move {
        let tester = RequisitionTransferTester::new(
            &request_site.store,
            &response_site.store,
            &item1,
            &item2,
        );

        log::info!(
            "Inserting request requisition on site {:?}",
            request_site.config
        );
        tester.insert_request_requisition(&request_site.connection);

        log::info!(
            "Updating request requisition to sent status on site {:?}",
            request_site.config
        );
        tester.update_request_requisition_to_sent(&request_site.service_provider);
        sync_and_delay(&request_site, &request_site).await;

        (tester, response_site)
    };

    let (mut tester, response_site) = tokio::select! {
        Err(err) = request_site_processors_task => unreachable!("{}", err),
        Err(err) = response_site_processors_task => unreachable!("{}", err),
        test_result = test => test_result,
    };
    // Since this test check transfers are forward on initialisation, we want to re-set database for response_site
    let (response_site, response_site_processors_task) =
        new_instance_of_existing_site(response_site, &format!("{}_site2_2", identifier)).await;

    let test = async move {
        // Site 2 should be re-initialised here
        sync_and_delay(&response_site, &response_site).await;
        log::info!(
            "Checking response requisition is created on site {:?}",
            response_site.config
        );
        tester.check_response_requisition_created(&response_site.connection);
    };

    tokio::select! {
        Err(err) = response_site_processors_task => unreachable!("{}", err),
        _ = test => (),
    };
}
