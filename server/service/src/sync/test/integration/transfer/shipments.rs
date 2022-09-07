use repository::ItemRow;
use serde_json::json;
use util::{inline_init, uuid::uuid};

use crate::{
    processors::transfer::shipment::test::ShipmentTransferTester,
    sync::test::integration::transfer::{new_instance_of_existing_site, sync_and_delay},
};

use super::{initialise_transfer_sites, SyncIntegrationTransferContext};

#[actix_rt::test]
async fn integration_sync_shipment_transfers_normal() {
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
        "sync_shipment_transfers_normal",
    )
    .await;

    let test = async move {
        let mut tester = ShipmentTransferTester::new(&site_1.store, &site_2.store, &item1, &item2);

        log::info!("Inserting request requisition on site {:?}", site_2.config);
        tester
            .insert_request_requisition(&site_2.service_provider)
            .await;

        sync_and_delay(&site_2, &site_1).await;

        log::info!(
            "Checking response requisition is created on site {:?}",
            site_1.config
        );
        tester
            .check_response_requisition_created(&site_1.connection)
            .await;

        log::info!("Inserting outbound shipment on site {:?}", site_1.config);
        tester.insert_outbound_shipment(&site_1.connection).await;

        sync_and_delay(&site_1, &site_2).await;

        log::info!(
            "Checking inbound shipment is not created on site {:?}",
            site_2.config
        );
        tester.check_inbound_shipment_not_created(&site_2.connection);

        log::info!(
            "Updating outbound shipment to picked on site {:?}",
            site_1.config
        );
        tester.update_outbound_shipment_to_picked(&site_1.service_provider);

        sync_and_delay(&site_1, &site_2).await;

        log::info!(
            "Checking inbound shipment is created on site {:?}",
            site_2.config
        );
        tester.check_inbound_shipment_created(&site_2.connection);

        sync_and_delay(&site_2, &site_1).await;

        log::info!(
            "Checking outbound shipment was linked on site {:?}",
            site_1.config
        );

        tester.check_outbound_shipment_was_linked(&site_1.connection);

        log::info!("Update outbound shipment lines on site {:?}", site_1.config);

        tester.update_outbound_shipment_lines(&site_1.service_provider);

        log::info!(
            "Update outbound shipment to shipped on site {:?}",
            site_1.config
        );

        tester.update_outbound_shipment_to_shipped(&site_1.service_provider);

        sync_and_delay(&site_1, &site_2).await;

        log::info!(
            "Checking inbound shipment was updated on site {:?}",
            site_2.config
        );
        tester.check_inbound_shipment_was_updated(&site_2.connection);

        log::info!(
            "Update inbound shipment to delivered on site {:?}",
            site_2.config
        );
        tester.update_inbound_shipment_to_delivered(&site_2.service_provider);

        sync_and_delay(&site_2, &site_1).await;

        log::info!(
            "Check outbound shipment status was update on site {:?}",
            site_1.config
        );
        tester.check_outbound_shipment_status_matches_inbound_shipment(&site_1.connection);

        log::info!(
            "Update inbound shipment to verified on site {:?}",
            site_2.config
        );
        tester.update_inbound_shipment_to_verified(&site_2.service_provider);

        sync_and_delay(&site_2, &site_1).await;

        log::info!(
            "Check outbound shipment status was update on site {:?}",
            site_1.config
        );
        tester.check_outbound_shipment_status_matches_inbound_shipment(&site_1.connection);
    };

    tokio::select! {
        Err(err) = site_1_processors_task => unreachable!("{}", err),
        Err(err) = site_2_processors_task => unreachable!("{}", err),
        _ = test => (),
    };
}

#[actix_rt::test]
async fn integration_sync_shipment_transfers_delete() {
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
        "shipment_transfers_delete",
    )
    .await;

    let test = async move {
        let mut tester = ShipmentTransferTester::new(&site_1.store, &site_2.store, &item1, &item2);

        log::info!("Inserting request requisition on site {:?}", site_2.config);
        tester
            .insert_request_requisition(&site_2.service_provider)
            .await;

        sync_and_delay(&site_2, &site_1).await;

        log::info!(
            "Checking response requisition is created on site {:?}",
            site_1.config
        );
        tester
            .check_response_requisition_created(&site_1.connection)
            .await;

        log::info!("Inserting outbound shipment on site {:?}", site_1.config);
        tester.insert_outbound_shipment(&site_1.connection).await;

        log::info!(
            "Updating outbound shipment to picked on site {:?}",
            site_1.config
        );
        tester.update_outbound_shipment_to_picked(&site_1.service_provider);

        sync_and_delay(&site_1, &site_2).await;

        log::info!(
            "Checking inbound shipment is created on site {:?}",
            site_2.config
        );
        tester.check_inbound_shipment_created(&site_2.connection);

        log::info!("Delete outbound shipment on site {:?}", site_1.config);

        tester.delete_outbound_shipment(&site_1.service_provider);

        sync_and_delay(&site_1, &site_2).await;

        log::info!("Check inbound shipment delete {:?}", site_1.config);

        tester.check_inbound_shipment_deleted(&site_1.connection);
    };

    tokio::select! {
        Err(err) = site_1_processors_task => unreachable!("{}", err),
        Err(err) = site_2_processors_task => unreachable!("{}", err),
        _ = test => (),
    };
}

#[actix_rt::test]
async fn integration_sync_shipment_transfers_initialise() {
    // util::init_logger(util::LogLevel::Info);
    let identifier = "shipment_transfers_initialise";

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
        let mut tester = ShipmentTransferTester::new(&site_1.store, &site_2.store, &item1, &item2);

        log::info!("Inserting request requisition on site {:?}", site_2.config);
        tester
            .insert_request_requisition(&site_2.service_provider)
            .await;

        sync_and_delay(&site_2, &site_1).await;

        log::info!(
            "Checking response requisition is created on site {:?}",
            site_1.config
        );
        tester
            .check_response_requisition_created(&site_1.connection)
            .await;

        log::info!("Inserting outbound shipment on site {:?}", site_1.config);
        tester.insert_outbound_shipment(&site_1.connection).await;

        log::info!(
            "Updating outbound shipment to picked on site {:?}",
            site_1.config
        );
        tester.update_outbound_shipment_to_picked(&site_1.service_provider);
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
            "Checking inbound shipment is created on site {:?}",
            site_2.config
        );
        tester.check_inbound_shipment_created(&site_2.connection);
    };

    tokio::select! {
        Err(err) = site_2_processors_task => unreachable!("{}", err),
        _ = test => (),
    };
}
