use repository::{CurrencyRow, ItemRow};
use serde_json::json;
use util::{inline_init, uuid::uuid};

use crate::{
    processors::transfer::shipment::test::ShipmentTransferTester,
    sync::test::integration::transfer::{new_instance_of_existing_site, sync_and_delay},
};

use super::{initialise_transfer_sites, SyncIntegrationTransferContext};

#[actix_rt::test]
async fn integration_sync_return_transfers_normal() {
    // util::init_logger(util::LogLevel::Info);

    let item1 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let item2 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let currency = inline_init(|r: &mut CurrencyRow| {
        r.id = String::from("currency_a");
        r.code = String::from("USD");
        r.rate = 1.0;
        r.is_home_currency = true;
    });

    let SyncIntegrationTransferContext {
        site_1: site_receiving_return,
        site_2: returning_site,
        site_1_processors_task: site_receiving_return_processors_task,
        site_2_processors_task: returning_site_processors_task,
    } = initialise_transfer_sites(
        json!({
            "item": [
                {"ID": item1.id, "type_of": "general"},
                {"ID": item2.id, "type_of": "general"},
            ],
            "currency": [
                {"ID": currency.id, "currency": currency.code, "rate": currency.rate, "is_home_currency": currency.is_home_currency}
            ]
        }),
        "sync_return_transfers_normal",
    )
    .await;

    let test = async move {
        let mut tester = ShipmentTransferTester::new(
            &site_receiving_return.store,
            &returning_site.store,
            None,
            None,
            &item1,
            &item2,
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
            "Inserting outbound return on site {:?}",
            returning_site.config
        );
        tester.insert_outbound_return(&returning_site.connection);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        log::info!(
            "Checking inbound return is not created on site {:?}",
            site_receiving_return.config
        );
        tester.check_inbound_return_not_created(&site_receiving_return.connection);

        log::info!(
            "Updating outbound return to picked on site {:?}",
            returning_site.config
        );
        tester.update_outbound_return_to_picked(&returning_site.service_provider);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        log::info!(
            "Checking inbound return is created on site {:?}",
            site_receiving_return.config
        );
        tester.check_inbound_return_created(&site_receiving_return.connection);

        sync_and_delay(&site_receiving_return, &returning_site).await;

        log::info!(
            "Checking outbound return was linked on site {:?}",
            returning_site.config
        );

        tester.check_outbound_return_was_linked(&returning_site.connection);

        log::info!(
            "Update outbound return line on site {:?}",
            returning_site.config
        );

        tester.update_outbound_return_line(&returning_site.service_provider);

        log::info!(
            "Update outbound return to shipped on site {:?}",
            returning_site.config
        );

        tester.update_outbound_return_to_shipped(&returning_site.service_provider);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        log::info!(
            "Checking inbound return was updated on site {:?}",
            site_receiving_return.config
        );
        tester.check_inbound_return_was_updated(&site_receiving_return.connection);

        log::info!(
            "Update inbound return to delivered on site {:?}",
            site_receiving_return.config
        );
        tester.update_inbound_return_to_delivered(&site_receiving_return.service_provider);

        sync_and_delay(&site_receiving_return, &returning_site).await;

        log::info!(
            "Check outbound return status was update on site {:?}",
            returning_site.config
        );
        tester.check_outbound_return_status_matches_inbound_return(&returning_site.connection);

        log::info!(
            "Update inbound return to verified on site {:?}",
            site_receiving_return.config
        );
        tester.update_inbound_return_to_verified(&site_receiving_return.service_provider);

        sync_and_delay(&site_receiving_return, &returning_site).await;

        log::info!(
            "Check outbound return status was update on site {:?}",
            returning_site.config
        );
        tester.check_outbound_return_status_matches_inbound_return(&returning_site.connection);
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

    let item1 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let item2 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let currency = inline_init(|r: &mut CurrencyRow| {
        r.id = String::from("currency_a");
        r.code = String::from("USD");
        r.rate = 1.0;
        r.is_home_currency = true;
    });

    let SyncIntegrationTransferContext {
        site_1: site_receiving_return,
        site_2: returning_site,
        site_1_processors_task: site_receiving_return_processors_task,
        site_2_processors_task: returning_site_processors_task,
    } = initialise_transfer_sites(
        json!({
            "item": [
                {"ID": item1.id, "type_of": "general"},
                {"ID": item2.id, "type_of": "general"},
            ],
            "currency": [
                {"ID": currency.id, "currency": currency.code, "rate": currency.rate, "is_home_currency": currency.is_home_currency}
            ]
        }),
        "shipment_transfers_delete",
    )
    .await;

    let test = async move {
        let mut tester = ShipmentTransferTester::new(
            &site_receiving_return.store,
            &returning_site.store,
            None,
            None,
            &item1,
            &item2,
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
            "Inserting outbound return on site {:?}",
            returning_site.config
        );
        tester.insert_outbound_return(&returning_site.connection);

        log::info!(
            "Updating outbound return to picked on site {:?}",
            returning_site.config
        );
        tester.update_outbound_return_to_picked(&returning_site.service_provider);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        log::info!(
            "Checking inbound return is created on site {:?}",
            site_receiving_return.config
        );
        tester.check_inbound_return_created(&site_receiving_return.connection);

        log::info!("Delete outbound return on site {:?}", returning_site.config);

        tester.delete_outbound_return(&returning_site.service_provider);

        sync_and_delay(&returning_site, &site_receiving_return).await;

        log::info!(
            "Check inbound return delete {:?}",
            site_receiving_return.config
        );

        tester.check_inbound_return_deleted(&site_receiving_return.connection);
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
    let identifier = "shipment_transfers_initialise";

    let item1 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let item2 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let currency = inline_init(|r: &mut CurrencyRow| {
        r.id = String::from("currency_a");
        r.code = String::from("USD");
        r.rate = 1.0;
        r.is_home_currency = true;
    });

    let SyncIntegrationTransferContext {
        site_1: site_receiving_return,
        site_2: returning_site,
        site_1_processors_task: site_receiving_return_processors_task,
        site_2_processors_task: returning_site_processors_task,
    } = initialise_transfer_sites(
        json!({
            "item": [
                {"ID": item1.id, "type_of": "general"},
                {"ID": item2.id, "type_of": "general"},
            ],
            "currency": [
                {"ID": currency.id, "currency": currency.code, "rate": currency.rate, "is_home_currency": currency.is_home_currency}
            ]
        }),
        identifier,
    )
    .await;

    let test = async move {
        let mut tester = ShipmentTransferTester::new(
            &site_receiving_return.store,
            &returning_site.store,
            None,
            None,
            &item1,
            &item2,
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
            "Inserting outbound return on site {:?}",
            returning_site.config
        );
        tester.insert_outbound_return(&returning_site.connection);

        log::info!(
            "Updating outbound return to picked on site {:?}",
            returning_site.config
        );
        tester.update_outbound_return_to_picked(&returning_site.service_provider);

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
            "Checking inbound return is created on site {:?}",
            site_receiving_return.config
        );
        tester.check_inbound_return_created(&site_receiving_return.connection);
    };

    tokio::select! {
        Err(err) = site_receiving_return_processors_task => unreachable!("{}", err),
        _ = test => (),
    };
}
