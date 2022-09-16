use repository::ItemRow;
use serde_json::json;
use util::{inline_init, uuid::uuid};

use crate::{
    processors::transfer::requisition::test::RequisitionTransferTester,
    sync::test::integration::transfer::{new_instance_of_existing_site, sync_and_delay},
};

use super::{initialise_transfer_sites, SyncIntegrationTransferContext};

#[actix_rt::test]
async fn integration_sync_requisition_transfers_normal() {
    // util::init_logger(util::LogLevel::Info);
    let item1 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let item2 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let SyncIntegrationTransferContext {
        site_1,
        site_2,
        site_1_processors_task,
        site_2_processors_task,
    } = initialise_transfer_sites(
        json!({
            "item": [
                {"ID": item1.id, "type_of": "general"},
                {"ID": item2.id, "type_of": "general"},
            ]
        }),
        "requisition_transfers_normal",
    )
    .await;

    let test = async move {
        let mut tester =
            RequisitionTransferTester::new(&site_1.store, &site_2.store, &item1, &item2);

        log::info!("Inserting request requisition on site {:?}", site_1.config);
        tester.insert_request_requisition(&site_1.connection).await;

        sync_and_delay(&site_1, &site_2).await;

        log::info!(
            "Checking response requisition is not created on site {:?}",
            site_2.config
        );
        tester.check_response_requisition_not_created(&site_2.connection);

        log::info!(
            "Updating request requisition to sent status on site {:?}",
            site_1.config
        );
        tester.update_request_requisition_to_sent(&site_1.service_provider);

        sync_and_delay(&site_1, &site_2).await;

        log::info!(
            "Checking response requisition is created on site {:?}",
            site_2.config
        );
        tester.check_response_requisition_created(&site_2.connection);

        sync_and_delay(&site_2, &site_1).await;

        log::info!(
            "Checking that request requisition was linked on site {:?}",
            site_1.config
        );
        tester.check_request_requisition_was_linked(&site_1.connection);

        log::info!(
            "Updating response requisition to finalised on site {:?}",
            site_2.config
        );
        tester.update_response_requisition_to_finalised(&site_2.service_provider);

        sync_and_delay(&site_2, &site_1).await;

        log::info!(
            "Checking request requisition status is updated to finalise on site {:?}",
            site_1.config
        );
        tester.check_request_requisition_status_updated(&site_1.connection);
    };

    tokio::select! {
        Err(err) = site_1_processors_task => unreachable!("{}", err),
        Err(err) = site_2_processors_task => unreachable!("{}", err),
        _ = test => (),
    };
}

#[actix_rt::test]
async fn integration_sync_requisition_transfers_initialisation() {
    // util::init_logger(util::LogLevel::Info);
    let identifier = "requisition_transfers_initialisation";

    let item1 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let item2 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let SyncIntegrationTransferContext {
        site_1,
        site_2,
        site_1_processors_task,
        site_2_processors_task,
    } = initialise_transfer_sites(
        json!({
            "item": [
                {"ID": item1.id, "type_of": "general"},
                {"ID": item2.id, "type_of": "general"},
            ]
        }),
        identifier,
    )
    .await;

    let test = async move {
        let tester = RequisitionTransferTester::new(&site_1.store, &site_2.store, &item1, &item2);

        log::info!("Inserting request requisition on site {:?}", site_1.config);
        tester.insert_request_requisition(&site_1.connection).await;

        log::info!(
            "Updating request requisition to sent status on site {:?}",
            site_1.config
        );
        tester.update_request_requisition_to_sent(&site_1.service_provider);
        sync_and_delay(&site_1, &site_1).await;

        (tester, site_2)
    };

    let (mut tester, site_2) = tokio::select! {
        Err(err) = site_1_processors_task => unreachable!("{}", err),
        Err(err) = site_2_processors_task => unreachable!("{}", err),
        test_result = test => test_result,
    };
    // Since this test check transfers are forward on initialisation, we want to re-set database for site_2
    let (site_2, site_2_processors_task) =
        new_instance_of_existing_site(site_2, &format!("{}_site2_2", identifier)).await;

    let test = async move {
        // Site 2 should be re-initialised here
        sync_and_delay(&site_2, &site_2).await;
        log::info!(
            "Checking response requisition is created on site {:?}",
            site_2.config
        );
        tester.check_response_requisition_created(&site_2.connection);
    };

    tokio::select! {
        Err(err) = site_2_processors_task => unreachable!("{}", err),
        _ = test => (),
    };
}
