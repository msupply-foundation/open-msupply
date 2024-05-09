use repository::{CurrencyRow, ItemRow};
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

    let currency = inline_init(|r: &mut CurrencyRow| {
        r.id = String::from("currency_a");
        r.code = String::from("USD");
        r.rate = 1.0;
        r.is_home_currency = true;
        r.is_active = true;
    });

    let SyncIntegrationTransferContext {
        site_1: outbound_and_response_site,
        site_2: inbound_and_request_site,
        site_1_processors_task: outbound_and_response_site_processors_task,
        site_2_processors_task: inbound_and_request_site_processors_task,
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
        "sync_shipment_transfers_normal",
    )
    .await;

    let test = async move {
        let mut tester = ShipmentTransferTester::new(
            &outbound_and_response_site.store,
            &inbound_and_request_site.store,
            None,
            None,
            &item1,
            &item2,
        );

        log::info!(
            "Inserting request requisition on site {:?}",
            inbound_and_request_site.config
        );
        tester
            .insert_request_requisition(&inbound_and_request_site.service_provider)
            .await;

        sync_and_delay(&inbound_and_request_site, &outbound_and_response_site).await;

        log::info!(
            "Checking response requisition is created on site {:?}",
            outbound_and_response_site.config
        );
        tester.check_response_requisition_created(&outbound_and_response_site.connection);

        log::info!(
            "Inserting outbound shipment on site {:?}",
            outbound_and_response_site.config
        );
        tester.insert_outbound_shipment(&outbound_and_response_site.connection);

        sync_and_delay(&outbound_and_response_site, &inbound_and_request_site).await;

        log::info!(
            "Checking inbound shipment is not created on site {:?}",
            inbound_and_request_site.config
        );
        tester.check_inbound_shipment_not_created(&inbound_and_request_site.connection);

        log::info!(
            "Updating outbound shipment to picked on site {:?}",
            outbound_and_response_site.config
        );
        tester.update_outbound_shipment_to_picked(&outbound_and_response_site.service_provider);

        sync_and_delay(&outbound_and_response_site, &inbound_and_request_site).await;

        log::info!(
            "Checking inbound shipment is created on site {:?}",
            inbound_and_request_site.config
        );
        tester.check_inbound_shipment_created(&inbound_and_request_site.connection);

        sync_and_delay(&inbound_and_request_site, &outbound_and_response_site).await;

        log::info!(
            "Checking outbound shipment was linked on site {:?}",
            outbound_and_response_site.config
        );

        tester.check_outbound_shipment_was_linked(&outbound_and_response_site.connection);

        log::info!(
            "Update outbound shipment lines on site {:?}",
            outbound_and_response_site.config
        );

        tester.update_outbound_shipment_lines(&outbound_and_response_site.service_provider);

        log::info!(
            "Update outbound shipment to shipped on site {:?}",
            outbound_and_response_site.config
        );

        tester.update_outbound_shipment_to_shipped(&outbound_and_response_site.service_provider);

        sync_and_delay(&outbound_and_response_site, &inbound_and_request_site).await;

        log::info!(
            "Checking inbound shipment was updated on site {:?}",
            inbound_and_request_site.config
        );
        tester.check_inbound_shipment_was_updated(&inbound_and_request_site.connection);

        log::info!(
            "Update inbound shipment to delivered on site {:?}",
            inbound_and_request_site.config
        );
        tester.update_inbound_shipment_to_delivered(&inbound_and_request_site.service_provider);

        sync_and_delay(&inbound_and_request_site, &outbound_and_response_site).await;

        log::info!(
            "Check outbound shipment status was update on site {:?}",
            outbound_and_response_site.config
        );
        tester.check_outbound_shipment_status_matches_inbound_shipment(
            &outbound_and_response_site.connection,
        );

        log::info!(
            "Update inbound shipment to verified on site {:?}",
            inbound_and_request_site.config
        );
        tester.update_inbound_shipment_to_verified(&inbound_and_request_site.service_provider);

        sync_and_delay(&inbound_and_request_site, &outbound_and_response_site).await;

        log::info!(
            "Check outbound shipment status was update on site {:?}",
            outbound_and_response_site.config
        );
        tester.check_outbound_shipment_status_matches_inbound_shipment(
            &outbound_and_response_site.connection,
        );
    };

    tokio::select! {
        Err(err) = outbound_and_response_site_processors_task => unreachable!("{}", err),
        Err(err) = inbound_and_request_site_processors_task => unreachable!("{}", err),
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

    let currency = inline_init(|r: &mut CurrencyRow| {
        r.id = String::from("currency_a");
        r.code = String::from("USD");
        r.rate = 1.0;
        r.is_home_currency = true;
        r.is_active = true;
    });

    let SyncIntegrationTransferContext {
        site_1: outbound_and_response_site,
        site_2: inbound_and_request_site,
        site_1_processors_task: outbound_and_response_site_processors_task,
        site_2_processors_task: inbound_and_request_site_processors_task,
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
            &outbound_and_response_site.store,
            &inbound_and_request_site.store,
            None,
            None,
            &item1,
            &item2,
        );

        log::info!(
            "Inserting request requisition on site {:?}",
            inbound_and_request_site.config
        );
        tester
            .insert_request_requisition(&inbound_and_request_site.service_provider)
            .await;

        sync_and_delay(&inbound_and_request_site, &outbound_and_response_site).await;

        log::info!(
            "Checking response requisition is created on site {:?}",
            outbound_and_response_site.config
        );
        tester.check_response_requisition_created(&outbound_and_response_site.connection);

        log::info!(
            "Inserting outbound shipment on site {:?}",
            outbound_and_response_site.config
        );
        tester.insert_outbound_shipment(&outbound_and_response_site.connection);

        log::info!(
            "Updating outbound shipment to picked on site {:?}",
            outbound_and_response_site.config
        );
        tester.update_outbound_shipment_to_picked(&outbound_and_response_site.service_provider);

        sync_and_delay(&outbound_and_response_site, &inbound_and_request_site).await;

        log::info!(
            "Checking inbound shipment is created on site {:?}",
            inbound_and_request_site.config
        );
        tester.check_inbound_shipment_created(&inbound_and_request_site.connection);

        log::info!(
            "Delete outbound shipment on site {:?}",
            outbound_and_response_site.config
        );

        tester.delete_outbound_shipment(&outbound_and_response_site.service_provider);

        sync_and_delay(&outbound_and_response_site, &inbound_and_request_site).await;

        log::info!(
            "Check inbound shipment delete {:?}",
            outbound_and_response_site.config
        );

        tester.check_inbound_shipment_deleted(&outbound_and_response_site.connection);
    };

    tokio::select! {
        Err(err) = outbound_and_response_site_processors_task => unreachable!("{}", err),
        Err(err) = inbound_and_request_site_processors_task => unreachable!("{}", err),
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

    let currency = inline_init(|r: &mut CurrencyRow| {
        r.id = String::from("currency_a");
        r.code = String::from("USD");
        r.rate = 1.0;
        r.is_home_currency = true;
        r.is_active = true;
    });

    let SyncIntegrationTransferContext {
        site_1: outbound_and_response_site,
        site_2: inbound_and_request_site,
        site_1_processors_task: outbound_and_response_site_processors_task,
        site_2_processors_task: inbound_and_request_site_processors_task,
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
            &outbound_and_response_site.store,
            &inbound_and_request_site.store,
            None,
            None,
            &item1,
            &item2,
        );

        log::info!(
            "Inserting request requisition on site {:?}",
            inbound_and_request_site.config
        );
        tester
            .insert_request_requisition(&inbound_and_request_site.service_provider)
            .await;

        sync_and_delay(&inbound_and_request_site, &outbound_and_response_site).await;

        log::info!(
            "Checking response requisition is created on site {:?}",
            outbound_and_response_site.config
        );
        tester.check_response_requisition_created(&outbound_and_response_site.connection);

        log::info!(
            "Inserting outbound shipment on site {:?}",
            outbound_and_response_site.config
        );
        tester.insert_outbound_shipment(&outbound_and_response_site.connection);

        log::info!(
            "Updating outbound shipment to picked on site {:?}",
            outbound_and_response_site.config
        );
        tester.update_outbound_shipment_to_picked(&outbound_and_response_site.service_provider);
        sync_and_delay(&outbound_and_response_site, &outbound_and_response_site).await;
        (tester, inbound_and_request_site)
    };

    let (mut tester, inbound_and_request_site) = tokio::select! {
        Err(err) = outbound_and_response_site_processors_task => unreachable!("{}", err),
        Err(err) = inbound_and_request_site_processors_task => unreachable!("{}", err),
        test_result = test => test_result,
    };
    // Since this test check transfers are forward on initialisation, we want to re-set database for inbound_and_request_site
    let (inbound_and_request_site, inbound_and_request_site_processors_task) =
        new_instance_of_existing_site(inbound_and_request_site, &format!("{}_site2_2", identifier))
            .await;

    let test = async move {
        // Site 2 should be re-initialised here
        sync_and_delay(&inbound_and_request_site, &inbound_and_request_site).await;
        log::info!(
            "Checking inbound shipment is created on site {:?}",
            inbound_and_request_site.config
        );
        tester.check_inbound_shipment_created(&inbound_and_request_site.connection);
    };

    tokio::select! {
        Err(err) = inbound_and_request_site_processors_task => unreachable!("{}", err),
        _ = test => (),
    };
}
