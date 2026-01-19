use chrono::NaiveDate;
use repository::{
    mock::{insert_extra_mock_data, MockData, MockDataInserts},
    EqualFilter, InvoiceFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    InvoiceLineRowRepository, InvoiceLineType, InvoiceRepository, InvoiceRow, InvoiceRowRepository,
    InvoiceStatus, InvoiceType, ItemRow, ItemRowRepository, ItemStoreJoinRow,
    ItemStoreJoinRowRepository, ItemStoreJoinRowRepositoryTrait, KeyType, KeyValueStoreRow,
    LocationRow, NameLinkRow, NameRow, RequisitionFilter, RequisitionRepository, RequisitionRow,
    RequisitionRowRepository, RequisitionStatus, RequisitionType, StockLineRow, StorageConnection,
    StoreRow,
};
use util::uuid::uuid;

use crate::{
    invoice::{
        customer_return::{UpdateCustomerReturn, UpdateCustomerReturnStatus},
        inbound_shipment::{UpdateInboundShipment, UpdateInboundShipmentStatus},
        outbound_shipment::update::{UpdateOutboundShipment, UpdateOutboundShipmentStatus},
        supplier_return::update::{UpdateSupplierReturn, UpdateSupplierReturnStatus},
    },
    invoice_line::stock_out_line::{StockOutType, UpdateStockOutLine},
    processors::{test_helpers::exec_concurrent, transfer::invoice::common::get_cost_plus_margin},
    requisition::request_requisition::{UpdateRequestRequisition, UpdateRequestRequisitionStatus},
    service_provider::ServiceProvider,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

/// This test is for requesting and responding store on the same site
/// See same site transfer diagram in requisition README.md for example of how
/// changelog is upserted and processed by the same instance of triggered processor
#[tokio::test(flavor = "multi_thread", worker_threads = 3)]
async fn invoice_transfers() {
    let site_id = 25;
    let outbound_store_name = NameRow {
        id: uuid(),
        name: uuid(),
        ..Default::default()
    };

    let outbound_store = StoreRow {
        id: uuid(),
        name_id: outbound_store_name.id.clone(),
        site_id,
        ..Default::default()
    };

    let inbound_store_name = NameRow {
        id: uuid(),
        name: uuid(),
        ..Default::default()
    };

    let inbound_store = StoreRow {
        id: uuid(),
        name_id: inbound_store_name.id.clone(),
        site_id,
        ..Default::default()
    };

    let item1 = ItemRow {
        id: uuid(),
        default_pack_size: 10.0,
        ..Default::default()
    };

    let item2 = ItemRow {
        id: uuid(),
        ..Default::default()
    };

    let item3 = ItemRow {
        id: uuid(),
        ..Default::default()
    };

    let service_item = ItemRow {
        id: uuid(),
        ..Default::default()
    };

    let site_id_settings = KeyValueStoreRow {
        id: KeyType::SettingsSyncSiteId,
        value_int: Some(site_id),
        ..Default::default()
    };

    // Will use default_sell_price_per_pack for pricing
    let item1_store_properties = ItemStoreJoinRow {
        id: uuid(),
        item_link_id: item1.id.clone(),
        store_id: inbound_store.id.clone(),
        default_sell_price_per_pack: 20.0,
        ignore_for_orders: false,
        margin: 10.0,
    };

    // No default price - will use cost price + margin for pricing
    let item3_store_properties = ItemStoreJoinRow {
        id: uuid(),
        item_link_id: item3.id.clone(),
        store_id: inbound_store.id.clone(),
        default_sell_price_per_pack: 0.0,
        ignore_for_orders: false,
        margin: 10.0,
    };

    let ServiceTestContext {
        service_provider,
        processors_task,
        ..
    } = setup_all_with_data_and_service_provider(
        "invoice_transfers",
        MockDataInserts::none()
            .stores()
            .names()
            .items()
            .units()
            .currencies(),
        MockData {
            names: vec![inbound_store_name.clone(), outbound_store_name.clone()],
            stores: vec![inbound_store.clone(), outbound_store.clone()],
            items: vec![
                item1.clone(),
                item2.clone(),
                item3.clone(),
                service_item.clone(),
            ],
            item_store_joins: vec![item1_store_properties, item3_store_properties],
            key_value_store_rows: vec![site_id_settings],
            ..Default::default()
        },
    )
    .await;

    let test_input = (
        service_provider,
        inbound_store,
        inbound_store_name,
        outbound_store,
        outbound_store_name,
        item1,
        item2,
        item3,
        service_item,
    );

    let number_of_instances = 6;

    let test_handle = exec_concurrent(
        test_input,
        number_of_instances,
        |_, test_input| async move {
            let (
                service_provider,
                inbound_store,
                inbound_store_name,
                outbound_store,
                outbound_store_name,
                item1,
                item2,
                item3,
                service_item,
            ) = test_input;

            let ctx = service_provider.basic_context().unwrap();

            // Without delete
            let mut tester = InvoiceTransferTester::new(
                &outbound_store,
                &inbound_store,
                Some(&outbound_store_name),
                Some(&inbound_store_name),
                &item1,
                &item2,
                &item3,
                &service_item,
            );

            tester.insert_request_requisition(&service_provider).await;
            ctx.processors_trigger.await_events_processed().await;
            tester.check_response_requisition_created(&ctx.connection);

            // SHIPMENT
            tester.insert_outbound_shipment(&ctx.connection);
            // manually trigger because inserting the shipment didn't trigger the processor
            // and we want to check that shipment is not created when processors runs
            ctx.processors_trigger
                .invoice_transfer
                .try_send(())
                .unwrap();
            ctx.processors_trigger.await_events_processed().await;
            tester.check_inbound_shipment_not_created(&ctx.connection);
            tester.update_outbound_shipment_to_picked(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_inbound_shipment_created(&ctx.connection);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_outbound_shipment_was_linked(&ctx.connection);
            tester.update_outbound_shipment_lines(&service_provider);
            tester.update_outbound_shipment_to_shipped(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_inbound_shipment_was_updated(&ctx.connection);
            tester.update_inbound_shipment_to_delivered(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_outbound_shipment_status_matches_inbound_shipment(&ctx.connection);
            tester.update_inbound_shipment_to_verified(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_outbound_shipment_status_matches_inbound_shipment(&ctx.connection);

            // RETURN
            tester.insert_supplier_return(&ctx.connection);
            // manually trigger because inserting the return doesn't trigger the processor
            // and we want to check that shipment is not created when processors runs
            ctx.processors_trigger
                .invoice_transfer
                .try_send(())
                .unwrap();
            ctx.processors_trigger.await_events_processed().await;
            tester.check_customer_return_not_created(&ctx.connection);
            tester.update_supplier_return_to_picked(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_customer_return_created(&ctx.connection);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_supplier_return_was_linked(&ctx.connection);
            tester.update_supplier_return_line(&service_provider);
            tester.update_supplier_return_to_shipped(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_customer_return_was_updated(&ctx.connection);
            tester.update_customer_return_to_delivered(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_supplier_return_status_matches_customer_return(&ctx.connection);
            tester.update_customer_return_to_verified(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_supplier_return_status_matches_customer_return(&ctx.connection);

            // With delete -- SHIPMENT
            let mut tester = InvoiceTransferTester::new(
                &outbound_store,
                &inbound_store,
                Some(&outbound_store_name),
                Some(&inbound_store_name),
                &item1,
                &item2,
                &item3,
                &service_item,
            );

            // Setup: create requisition
            tester.insert_request_requisition(&service_provider).await;
            ctx.processors_trigger.await_events_processed().await;
            tester.check_response_requisition_created(&ctx.connection);

            // Create shipment, check it transfers, delete it, check inbound is deleted
            tester.insert_outbound_shipment(&ctx.connection);
            tester.update_outbound_shipment_to_picked(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_inbound_shipment_created(&ctx.connection);
            tester.delete_outbound_shipment(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_inbound_shipment_deleted(&ctx.connection);

            // With delete -- RETURN
            let mut tester = InvoiceTransferTester::new(
                &outbound_store,
                &inbound_store,
                Some(&outbound_store_name),
                Some(&inbound_store_name),
                &item1,
                &item2,
                &item3,
                &service_item,
            );
            // Setup: create shipment
            tester.insert_request_requisition(&service_provider).await;
            ctx.processors_trigger.await_events_processed().await;
            tester.check_response_requisition_created(&ctx.connection);
            tester.insert_outbound_shipment(&ctx.connection);
            tester.update_outbound_shipment_to_picked(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_inbound_shipment_created(&ctx.connection);

            // Create return, check it transfers, delete it, check inbound is deleted
            tester.insert_supplier_return(&ctx.connection);
            tester.update_supplier_return_to_picked(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_customer_return_created(&ctx.connection);
            tester.delete_supplier_return(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_customer_return_deleted(&ctx.connection);
        },
    );

    tokio::select! {
         Err(err) = processors_task => unreachable!("{}", err),
        _ = test_handle => (),
    };
}

/// Checking behavior when a request requisition name_link_id is that of a merged name. Response requisition for the merged name store should be generated regardless.
#[tokio::test(flavor = "multi_thread", worker_threads = 3)]
async fn invoice_transfers_with_merged_name() {
    let site_id = 25;

    let outbound_store_name = NameRow {
        id: uuid(),
        name: uuid(),
        ..Default::default()
    };

    let outbound_store = StoreRow {
        id: uuid(),
        name_id: outbound_store_name.id.clone(),
        site_id,
        ..Default::default()
    };

    let inbound_store_name = NameRow {
        id: uuid(),
        name: uuid(),
        ..Default::default()
    };

    let inbound_store = StoreRow {
        id: uuid(),
        name_id: inbound_store_name.id.clone(),
        site_id,
        ..Default::default()
    };

    let merge_name = NameRow {
        id: uuid(),
        name: uuid(),
        ..Default::default()
    };

    let merge_name_link = NameLinkRow {
        id: merge_name.id.clone(),
        name_id: inbound_store_name.id.clone(),
        ..Default::default()
    };

    let item1 = ItemRow {
        id: uuid(),
        default_pack_size: 10.0,
        ..Default::default()
    };

    let item2 = ItemRow {
        id: uuid(),
        ..Default::default()
    };

    let item3 = ItemRow {
        id: uuid(),
        default_pack_size: 10.0,
        ..Default::default()
    };

    let service_item = ItemRow {
        id: uuid(),
        ..Default::default()
    };

    let site_id_settings = KeyValueStoreRow {
        id: KeyType::SettingsSyncSiteId,
        value_int: Some(site_id),
        ..Default::default()
    };

    let item1_store_properties = ItemStoreJoinRow {
        id: uuid(),
        item_link_id: item1.id.clone(),
        store_id: inbound_store.id.clone(),
        default_sell_price_per_pack: 20.0,
        ignore_for_orders: false,
        margin: 0.0,
    };

    let item3_store_properties = ItemStoreJoinRow {
        id: uuid(),
        item_link_id: item3.id.clone(),
        store_id: inbound_store.id.clone(),
        default_sell_price_per_pack: 15.0,
        ignore_for_orders: false,
        margin: 10.0,
    };

    let ServiceTestContext {
        service_provider,
        processors_task,
        ..
    } = setup_all_with_data_and_service_provider(
        "invoice_transfers_with_merged_name",
        MockDataInserts::none()
            .stores()
            .names()
            .items()
            .units()
            .currencies(),
        MockData {
            names: vec![
                inbound_store_name.clone(),
                outbound_store_name.clone(),
                merge_name.clone(),
            ],
            stores: vec![inbound_store.clone(), outbound_store.clone()],
            items: vec![
                item1.clone(),
                item2.clone(),
                item3.clone(),
                service_item.clone(),
            ],
            key_value_store_rows: vec![site_id_settings],
            item_store_joins: vec![item1_store_properties, item3_store_properties],
            name_links: vec![merge_name_link.clone()],
            ..Default::default()
        },
    )
    .await;

    let test_input = (
        service_provider,
        inbound_store,
        merge_name,
        outbound_store,
        outbound_store_name,
        item1,
        item2,
        item3,
        service_item,
    );
    let number_of_instances = 6;

    let test_handle = exec_concurrent(
        test_input,
        number_of_instances,
        |_, test_input| async move {
            let (
                service_provider,
                inbound_store,
                merge_name,
                outbound_store,
                outbound_store_name,
                item1,
                item2,
                item3,
                service_item,
            ) = test_input;

            let ctx = service_provider.basic_context().unwrap();

            // Without delete
            let mut tester = InvoiceTransferTester::new(
                &outbound_store,
                &inbound_store,
                Some(&outbound_store_name),
                Some(&merge_name),
                &item1,
                &item2,
                &item3,
                &service_item,
            );

            // SHIPMENT
            tester.insert_outbound_shipment(&ctx.connection);
            // manually trigger because inserting the shipment didn't trigger the processor
            // and we want to check that shipment is not created when processors runs
            ctx.processors_trigger
                .invoice_transfer
                .try_send(())
                .unwrap();
            ctx.processors_trigger.await_events_processed().await;

            tester.check_inbound_shipment_not_created(&ctx.connection);
            tester.update_outbound_shipment_to_picked(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_inbound_shipment_created(&ctx.connection);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_outbound_shipment_was_linked(&ctx.connection);
            tester.update_outbound_shipment_lines(&service_provider);
            tester.update_outbound_shipment_to_shipped(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_inbound_shipment_was_updated(&ctx.connection);
            tester.update_inbound_shipment_to_delivered(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_outbound_shipment_status_matches_inbound_shipment(&ctx.connection);
            tester.update_inbound_shipment_to_verified(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_outbound_shipment_status_matches_inbound_shipment(&ctx.connection);

            // RETURN
            tester.insert_supplier_return(&ctx.connection);
            // manually trigger because inserting the return doesn't trigger the processor
            // and we want to check that shipment is not created when processors runs
            ctx.processors_trigger
                .invoice_transfer
                .try_send(())
                .unwrap();
            ctx.processors_trigger.await_events_processed().await;
            tester.check_customer_return_not_created(&ctx.connection);
            tester.update_supplier_return_to_picked(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_customer_return_created(&ctx.connection);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_supplier_return_was_linked(&ctx.connection);
            tester.update_supplier_return_line(&service_provider);
            tester.update_supplier_return_to_shipped(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_customer_return_was_updated(&ctx.connection);
            tester.update_customer_return_to_delivered(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_supplier_return_status_matches_customer_return(&ctx.connection);
            tester.update_customer_return_to_verified(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_supplier_return_status_matches_customer_return(&ctx.connection);

            // With delete -- SHIPMENT
            let mut tester = InvoiceTransferTester::new(
                &outbound_store,
                &inbound_store,
                Some(&outbound_store_name),
                Some(&merge_name),
                &item1,
                &item2,
                &item3,
                &service_item,
            );

            // Setup: create requisition
            tester.insert_request_requisition(&service_provider).await;
            ctx.processors_trigger.await_events_processed().await;
            tester.check_response_requisition_created(&ctx.connection);

            // Create shipment, check it transfers, delete it, check inbound is deleted
            tester.insert_outbound_shipment(&ctx.connection);
            tester.update_outbound_shipment_to_picked(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_inbound_shipment_created(&ctx.connection);
            tester.delete_outbound_shipment(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_inbound_shipment_deleted(&ctx.connection);

            // With delete -- RETURN
            let mut tester = InvoiceTransferTester::new(
                &outbound_store,
                &inbound_store,
                Some(&outbound_store_name),
                Some(&merge_name),
                &item1,
                &item2,
                &item3,
                &service_item,
            );

            // Setup: create shipment
            tester.insert_request_requisition(&service_provider).await;
            ctx.processors_trigger.await_events_processed().await;
            tester.check_response_requisition_created(&ctx.connection);
            tester.insert_outbound_shipment(&ctx.connection);
            tester.update_outbound_shipment_to_picked(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_inbound_shipment_created(&ctx.connection);

            // Create return, check it transfers, delete it, check inbound is deleted
            tester.insert_supplier_return(&ctx.connection);
            tester.update_supplier_return_to_picked(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_customer_return_created(&ctx.connection);
            tester.delete_supplier_return(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_customer_return_deleted(&ctx.connection);
        },
    );

    tokio::select! {
         Err(err) = processors_task => unreachable!("{}", err),
        _ = test_handle => (),
    };
}

pub(crate) struct InvoiceTransferTester {
    // TODO linked requisitions ?
    outbound_store: StoreRow,
    inbound_store: StoreRow,
    request_requisition: RequisitionRow,
    outbound_shipment_line1: InvoiceLineRow,
    outbound_shipment_line2: InvoiceLineRow,
    outbound_shipment_line3: InvoiceLineRow,
    outbound_shipment_unallocated_line: InvoiceLineRow,
    outbound_shipment_service_line: InvoiceLineRow,
    supplier_return_line: InvoiceLineRow,
    supplier_return: InvoiceRow,
    outbound_shipment: InvoiceRow,
    customer_return: Option<InvoiceRow>,
    inbound_shipment: Option<InvoiceRow>,
    response_requisition: Option<RequisitionRow>,
    extra_mock_data: MockData,
    // outbound_name: NameRow
    outbound_name: Option<NameRow>,
}

impl InvoiceTransferTester {
    pub(crate) fn new(
        outbound_store: &StoreRow,
        inbound_store: &StoreRow,
        outbound_name: Option<&NameRow>,
        inbound_name: Option<&NameRow>,
        item1: &ItemRow,
        item2: &ItemRow,
        item3: &ItemRow,
        service_item: &ItemRow,
    ) -> InvoiceTransferTester {
        let request_requisition = RequisitionRow {
            id: uuid(),
            name_id: outbound_store.name_id.clone(),
            store_id: inbound_store.id.clone(),
            r#type: RequisitionType::Request,
            status: RequisitionStatus::Draft,
            ..Default::default()
        };

        let outbound_shipment = InvoiceRow {
            id: uuid(),
            name_id: inbound_name.map_or(inbound_store.name_id.clone(), |n| n.id.clone()),
            store_id: outbound_store.id.clone(),
            invoice_number: 20,
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::Allocated,
            their_reference: Some("some reference".to_string()),
            comment: Some("some comment".to_string()),
            created_datetime: NaiveDate::from_ymd_opt(2024, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap(),
            tax_percentage: Some(0.0),
            ..Default::default()
        };

        let location = LocationRow {
            id: uuid(),
            store_id: outbound_store.id.clone(),
            ..Default::default()
        };

        let stock_line1 = StockLineRow {
            id: uuid(),
            store_id: outbound_store.id.clone(),
            item_link_id: item1.id.clone(),
            batch: Some(uuid()),
            expiry_date: Some(NaiveDate::from_ymd_opt(2025, 3, 1).unwrap()),
            pack_size: 10.0,
            total_number_of_packs: 200.0,
            available_number_of_packs: 200.0,
            ..Default::default()
        };

        let outbound_shipment_line1 = InvoiceLineRow {
            id: uuid(),
            invoice_id: outbound_shipment.id.clone(),
            r#type: InvoiceLineType::StockOut,
            pack_size: stock_line1.pack_size,
            number_of_packs: 2.0,
            item_link_id: item1.id.clone(),
            item_name: item1.name.clone(),
            item_code: item1.code.clone(),
            cost_price_per_pack: 20.0,
            sell_price_per_pack: 10.0,
            batch: stock_line1.batch.clone(),
            expiry_date: stock_line1.expiry_date,
            stock_line_id: Some(stock_line1.id.clone()),
            location_id: Some(location.id.clone()),
            tax_percentage: Some(0.0),
            ..Default::default()
        };

        let stock_line2 = StockLineRow {
            id: uuid(),
            store_id: outbound_store.id.clone(),
            item_link_id: item2.id.clone(),
            batch: Some(uuid()),
            pack_size: 10.0,
            total_number_of_packs: 200.0,
            available_number_of_packs: 200.0,
            expiry_date: Some(NaiveDate::from_ymd_opt(2023, 1, 5).unwrap()),
            ..Default::default()
        };

        let outbound_shipment_line2 = InvoiceLineRow {
            id: uuid(),
            invoice_id: outbound_shipment.id.clone(),
            r#type: InvoiceLineType::StockOut,
            pack_size: stock_line2.pack_size,
            number_of_packs: 6.0,
            item_link_id: item2.id.clone(),
            item_name: item2.name.clone(),
            item_code: item2.code.clone(),
            cost_price_per_pack: 15.0,
            sell_price_per_pack: 35.0,
            batch: stock_line2.batch.clone(),
            expiry_date: stock_line2.expiry_date,
            stock_line_id: Some(stock_line2.id.clone()),
            tax_percentage: Some(0.0),
            // Location todo
            ..Default::default()
        };

        let stock_line3 = StockLineRow {
            id: uuid(),
            store_id: outbound_store.id.clone(),
            item_link_id: item3.id.clone(),
            batch: Some(uuid()),
            expiry_date: Some(NaiveDate::from_ymd_opt(2025, 10, 1).unwrap()),
            pack_size: 5.0,
            total_number_of_packs: 100.0,
            available_number_of_packs: 100.0,
            ..Default::default()
        };

        let outbound_shipment_line3 = InvoiceLineRow {
            id: uuid(),
            invoice_id: outbound_shipment.id.clone(),
            r#type: InvoiceLineType::StockOut,
            pack_size: stock_line3.pack_size,
            number_of_packs: 2.0,
            item_link_id: item3.id.clone(),
            item_name: item3.name.clone(),
            item_code: item3.code.clone(),
            cost_price_per_pack: 10.0,
            sell_price_per_pack: 15.0,
            batch: stock_line3.batch.clone(),
            expiry_date: stock_line3.expiry_date,
            stock_line_id: Some(stock_line3.id.clone()),
            location_id: Some(location.id.clone()),
            tax_percentage: Some(0.0),
            ..Default::default()
        };

        let outbound_shipment_service_line = InvoiceLineRow {
            id: uuid(),
            invoice_id: outbound_shipment.id.clone(),
            r#type: InvoiceLineType::Service,
            item_link_id: service_item.id.clone(),
            item_name: service_item.name.clone(),
            item_code: service_item.code.clone(),
            total_before_tax: 100.0,
            total_after_tax: 110.0,
            tax_percentage: Some(10.0),
            // Location todo
            ..Default::default()
        };

        let outbound_shipment_unallocated_line = InvoiceLineRow {
            id: uuid(),
            invoice_id: outbound_shipment.id.clone(),
            r#type: InvoiceLineType::UnallocatedStock,
            pack_size: 1.0,
            number_of_packs: 10.0,
            item_link_id: item2.id.clone(),
            item_name: item2.name.clone(),
            item_code: item2.code.clone(),
            tax_percentage: Some(0.0),
            ..Default::default()
        };

        let supplier_return = InvoiceRow {
            id: uuid(),
            name_id: outbound_name
                .map_or(outbound_store.name_id.clone(), |n| n.id.clone()),
            store_id: inbound_store.id.clone(),
            invoice_number: 5,
            r#type: InvoiceType::SupplierReturn,
            status: InvoiceStatus::New,
            their_reference: Some("some return reference".to_string()),
            comment: Some("some return comment".to_string()),
            created_datetime: NaiveDate::from_ymd_opt(2024, 1, 1)
                .unwrap()
                .and_hms_milli_opt(13, 00, 0, 0)
                .unwrap(),
            ..Default::default()
        };

        let supplier_return_line = InvoiceLineRow {
            id: uuid(),
            invoice_id: supplier_return.id.clone(),
            r#type: InvoiceLineType::StockOut,
            pack_size: stock_line1.pack_size,
            number_of_packs: 2.0,
            item_link_id: item1.id.clone(),
            item_name: item1.name.clone(),
            item_code: item1.code.clone(),
            cost_price_per_pack: 20.0,
            sell_price_per_pack: 10.0,
            batch: stock_line1.batch.clone(),
            expiry_date: stock_line1.expiry_date,
            stock_line_id: Some(stock_line1.id.clone()),
            location_id: Some(location.id.clone()),
            tax_percentage: Some(0.0),
            ..Default::default()
        };

        InvoiceTransferTester {
            outbound_store: outbound_store.clone(),
            inbound_store: inbound_store.clone(),
            request_requisition,
            outbound_shipment_line1,
            outbound_shipment_line2,
            outbound_shipment_line3,
            outbound_shipment_unallocated_line,
            outbound_shipment_service_line,
            supplier_return_line,
            supplier_return,
            outbound_shipment,
            outbound_name: outbound_name.cloned(),
            customer_return: None,
            inbound_shipment: None,
            response_requisition: None,
            extra_mock_data: MockData {
                stock_lines: vec![stock_line1, stock_line2, stock_line3],
                locations: vec![location],
                ..Default::default()
            },
        }
    }

    // These methods to be run in sequence

    // Need request/response requisition to check that requisitions are linked to invoices correctly

    pub(crate) async fn insert_request_requisition(&self, service_provider: &ServiceProvider) {
        let ctx = service_provider
            .context(self.inbound_store.id.clone(), "".to_string())
            .unwrap();

        RequisitionRowRepository::new(&ctx.connection)
            .upsert_one(&self.request_requisition)
            .unwrap();

        service_provider
            .requisition_service
            .update_request_requisition(
                &ctx,
                UpdateRequestRequisition {
                    id: self.request_requisition.id.clone(),
                    status: Some(UpdateRequestRequisitionStatus::Sent),
                    ..Default::default()
                },
            )
            .unwrap();
    }

    pub(crate) fn check_response_requisition_created(&mut self, connection: &StorageConnection) {
        let response_requisition = RequisitionRepository::new(connection)
            .query_one(
                RequisitionFilter::new().linked_requisition_id(EqualFilter::equal_to(
                    self.request_requisition.id.to_string(),
                )),
            )
            .unwrap();
        assert!(response_requisition.is_some());
        self.response_requisition = Some(response_requisition.unwrap().requisition_row);
    }

    pub(crate) fn insert_outbound_shipment(&self, connection: &StorageConnection) {
        let response_requisition_id = self.response_requisition.clone().map(|r| r.id);
        insert_extra_mock_data(
            connection,
            MockData {
                invoices: vec![{
                    let mut r = self.outbound_shipment.clone();
                    r.requisition_id = response_requisition_id;
                    r
                }],
                invoice_lines: vec![
                    self.outbound_shipment_line1.clone(),
                    self.outbound_shipment_line2.clone(),
                    self.outbound_shipment_line3.clone(),
                    self.outbound_shipment_service_line.clone(),
                ],
                ..Default::default()
            }
            .join(self.extra_mock_data.clone()),
        );
    }

    pub(crate) fn check_inbound_shipment_not_created(&self, connection: &StorageConnection) {
        assert_eq!(
            InvoiceRepository::new(connection).query_one(
                InvoiceFilter::new_match_linked_invoice_id(&self.outbound_shipment.id)
            ),
            Ok(None)
        )
    }

    pub(crate) fn update_outbound_shipment_to_picked(
        &mut self,
        service_provider: &ServiceProvider,
    ) {
        let ctx = service_provider
            .context(self.outbound_store.id.clone(), "".to_string())
            .unwrap();
        self.outbound_shipment = service_provider
            .invoice_service
            .update_outbound_shipment(
                &ctx,
                UpdateOutboundShipment {
                    id: self.outbound_shipment.id.clone(),
                    status: Some(UpdateOutboundShipmentStatus::Picked),
                    ..Default::default()
                },
            )
            .unwrap()
            .invoice_row;

        // This should not be possible, omSupply service does not allow placeholder/unallocated lines in `picked` invoices
        // but mSupply does so we want to replicate it (make sure they don't travel through)
        InvoiceLineRowRepository::new(&ctx.connection)
            .upsert_one(&self.outbound_shipment_unallocated_line)
            .unwrap();
    }

    pub(crate) fn check_inbound_shipment_created(&mut self, connection: &StorageConnection) {
        let inbound_shipment = InvoiceRepository::new(connection)
            .query_one(InvoiceFilter::new_match_linked_invoice_id(
                &self.outbound_shipment.id,
            ))
            .unwrap();

        assert!(inbound_shipment.is_some());
        let inbound_shipment = inbound_shipment.unwrap().invoice_row;
        self.inbound_shipment = Some(inbound_shipment.clone());

        assert_eq!(inbound_shipment.r#type, InvoiceType::InboundShipment);
        assert_eq!(inbound_shipment.store_id, self.inbound_store.id);
        assert_eq!(
            inbound_shipment.name_id,
            self.outbound_store.name_id
        );
        assert_eq!(
            inbound_shipment.name_store_id,
            Some(self.outbound_store.id.clone())
        );
        assert_eq!(
            inbound_shipment.their_reference,
            Some("From invoice number: 20 (some reference)".to_string())
        );
        assert_eq!(
            inbound_shipment.transport_reference,
            self.outbound_shipment.transport_reference
        );
        assert_eq!(
            inbound_shipment.comment,
            Some("Stock transfer (some comment)".to_string())
        );
        assert_eq!(inbound_shipment.colour, None);
        assert_eq!(inbound_shipment.user_id, None);
        assert_eq!(inbound_shipment.on_hold, false);
        assert_eq!(inbound_shipment.allocated_datetime, None);

        if self.response_requisition.is_some() {
            assert_eq!(
                inbound_shipment.requisition_id,
                Some(self.request_requisition.id.clone())
            );
        };

        check_invoice_status(&inbound_shipment, &self.outbound_shipment);

        assert_eq!(
            InvoiceLineRepository::new(connection)
                .count(Some(InvoiceLineFilter::new().invoice_id(
                    EqualFilter::equal_to(inbound_shipment.id.to_string())
                )))
                .unwrap(),
            4
        );

        check_line(
            connection,
            &inbound_shipment.id,
            &self.outbound_shipment_line1,
        );

        check_line_pricing(
            connection,
            &inbound_shipment.id,
            &inbound_shipment.store_id,
            &self.outbound_shipment_line1,
            self.outbound_shipment_line1.item_link_id.clone(),
            self.outbound_name.as_ref(),
        );

        check_line(
            connection,
            &inbound_shipment.id,
            &self.outbound_shipment_line2,
        );

        check_line_pricing(
            connection,
            &inbound_shipment.id,
            &inbound_shipment.store_id,
            &self.outbound_shipment_line2,
            self.outbound_shipment_line2.item_link_id.clone(),
            self.outbound_name.as_ref(),
        );

        check_line(
            connection,
            &inbound_shipment.id,
            &self.outbound_shipment_line3,
        );

        check_line_pricing(
            connection,
            &inbound_shipment.id,
            &inbound_shipment.store_id,
            &self.outbound_shipment_line3,
            self.outbound_shipment_line3.item_link_id.clone(),
            self.outbound_name.as_ref(),
        );
        check_line(
            connection,
            &inbound_shipment.id,
            &self.outbound_shipment_service_line,
        );
    }

    pub(crate) fn check_outbound_shipment_was_linked(&self, connection: &StorageConnection) {
        let outbound_shipment = InvoiceRowRepository::new(connection)
            .find_one_by_id(&self.outbound_shipment.id)
            .unwrap();

        assert!(outbound_shipment.is_some());

        assert_eq!(
            outbound_shipment.unwrap().linked_invoice_id,
            self.inbound_shipment.clone().map(|r| r.id)
        );
    }

    // This to be skipped on second attempt
    pub(crate) fn delete_outbound_shipment(&self, service_provider: &ServiceProvider) {
        let ctx = service_provider
            .context(self.outbound_store.id.clone(), "".to_string())
            .unwrap();
        service_provider
            .invoice_service
            .delete_outbound_shipment(&ctx, self.outbound_shipment.id.clone())
            .unwrap();
    }
    // This to be skipped on second attempt
    pub(crate) fn check_inbound_shipment_deleted(&mut self, connection: &StorageConnection) {
        let inbound_shipment_id = &self.inbound_shipment.clone().map(|r| r.id).unwrap();
        assert_eq!(
            InvoiceLineRepository::new(connection)
                .count(Some(InvoiceLineFilter::new().invoice_id(
                    EqualFilter::equal_to(inbound_shipment_id.to_string())
                )))
                .unwrap(),
            0
        );

        assert_eq!(
            InvoiceRowRepository::new(connection)
                .find_one_by_id(inbound_shipment_id)
                .unwrap(),
            None
        );
    }

    pub(crate) fn update_outbound_shipment_lines(&mut self, service_provider: &ServiceProvider) {
        let ctx = service_provider
            .context(self.outbound_store.id.clone(), "".to_string())
            .unwrap();

        InvoiceLineRowRepository::new(&ctx.connection)
            .delete(&self.outbound_shipment_line1.id)
            .unwrap();

        self.outbound_shipment_line2 = service_provider
            .invoice_line_service
            .update_stock_out_line(
                &ctx,
                UpdateStockOutLine {
                    id: self.outbound_shipment_line2.id.clone(),
                    number_of_packs: Some(21.0),
                    r#type: Some(StockOutType::OutboundShipment),
                    ..Default::default()
                },
            )
            .unwrap()
            .invoice_line_row;
    }
    pub(crate) fn update_outbound_shipment_to_shipped(
        &mut self,
        service_provider: &ServiceProvider,
    ) {
        let ctx = service_provider
            .context(self.outbound_store.id.clone(), "".to_string())
            .unwrap();

        self.outbound_shipment = service_provider
            .invoice_service
            .update_outbound_shipment(
                &ctx,
                UpdateOutboundShipment {
                    id: self.outbound_shipment.id.clone(),
                    their_reference: Some("some updated reference".to_string()),
                    status: Some(UpdateOutboundShipmentStatus::Shipped),
                    ..Default::default()
                },
            )
            .unwrap()
            .invoice_row;
    }

    pub(crate) fn check_inbound_shipment_was_updated(&mut self, connection: &StorageConnection) {
        let inbound_shipment = InvoiceRowRepository::new(connection)
            .find_one_by_id(&self.inbound_shipment.clone().map(|r| r.id).unwrap())
            .unwrap();

        assert!(inbound_shipment.is_some());
        let inbound_shipment = inbound_shipment.unwrap();

        assert_eq!(inbound_shipment, {
            let mut r = inbound_shipment.clone();
            r.status = InvoiceStatus::Shipped;
            r.shipped_datetime = self.outbound_shipment.shipped_datetime;
            r.their_reference =
                Some("From invoice number: 20 (some updated reference)".to_string());
            r
        });

        assert_eq!(
            InvoiceLineRepository::new(connection)
                .count(Some(InvoiceLineFilter::new().invoice_id(
                    EqualFilter::equal_to(inbound_shipment.id.to_string())
                )))
                .unwrap(),
            3
        );

        check_line(
            connection,
            &inbound_shipment.id,
            &self.outbound_shipment_line2,
        );
        check_line(
            connection,
            &inbound_shipment.id,
            &self.outbound_shipment_service_line,
        );

        self.inbound_shipment = Some(inbound_shipment)
    }

    pub(crate) fn update_inbound_shipment_to_delivered(
        &mut self,
        service_provider: &ServiceProvider,
    ) {
        let ctx = service_provider
            .context(self.inbound_store.id.clone(), "".to_string())
            .unwrap();

        let inbound_shipment = service_provider
            .invoice_service
            .update_inbound_shipment(
                &ctx,
                UpdateInboundShipment {
                    id: self.inbound_shipment.clone().map(|r| r.id).unwrap(),
                    status: Some(UpdateInboundShipmentStatus::Received),
                    ..Default::default()
                },
            )
            .unwrap();

        self.inbound_shipment = Some(inbound_shipment.invoice_row);
    }

    pub(crate) fn update_inbound_shipment_to_verified(
        &mut self,
        service_provider: &ServiceProvider,
    ) {
        let ctx = service_provider
            .context(self.inbound_store.id.clone(), "".to_string())
            .unwrap();

        let inbound_shipment = service_provider
            .invoice_service
            .update_inbound_shipment(
                &ctx,
                UpdateInboundShipment {
                    id: self.inbound_shipment.clone().map(|r| r.id).unwrap(),
                    status: Some(UpdateInboundShipmentStatus::Verified),
                    ..Default::default()
                },
            )
            .unwrap();

        self.inbound_shipment = Some(inbound_shipment.invoice_row);
    }

    pub(crate) fn check_outbound_shipment_status_matches_inbound_shipment(
        &mut self,
        connection: &StorageConnection,
    ) {
        let outbound_shipment = InvoiceRowRepository::new(connection)
            .find_one_by_id(&self.outbound_shipment.id)
            .unwrap();

        assert!(outbound_shipment.is_some());
        check_invoice_status(
            &outbound_shipment.unwrap(),
            &self.inbound_shipment.clone().unwrap(),
        )
    }

    pub(crate) fn insert_supplier_return(&self, connection: &StorageConnection) {
        let inbound_shipment_id = self.inbound_shipment.clone().map(|r| r.id);
        insert_extra_mock_data(
            connection,
            MockData {
                invoices: vec![{
                    let mut r = self.supplier_return.clone();
                    r.original_shipment_id = inbound_shipment_id;
                    r
                }],
                invoice_lines: vec![self.supplier_return_line.clone()],
                ..Default::default()
            }
            .join(self.extra_mock_data.clone()),
        );
    }

    pub(crate) fn check_customer_return_not_created(&self, connection: &StorageConnection) {
        assert_eq!(
            InvoiceRepository::new(connection).query_one(
                InvoiceFilter::new_match_linked_invoice_id(&self.supplier_return.id)
            ),
            Ok(None)
        )
    }

    pub(crate) fn update_supplier_return_to_picked(&mut self, service_provider: &ServiceProvider) {
        let ctx = service_provider
            .context(self.inbound_store.id.clone(), "".to_string())
            .unwrap();
        self.supplier_return = service_provider
            .invoice_service
            .update_supplier_return(
                &ctx,
                UpdateSupplierReturn {
                    supplier_return_id: self.supplier_return.id.clone(),
                    status: Some(UpdateSupplierReturnStatus::Picked),
                    ..Default::default()
                },
            )
            .unwrap()
            .invoice_row;
    }

    pub(crate) fn check_customer_return_created(&mut self, connection: &StorageConnection) {
        let customer_return = InvoiceRepository::new(connection)
            .query_one(InvoiceFilter::new_match_linked_invoice_id(
                &self.supplier_return.id,
            ))
            .unwrap();

        assert!(customer_return.is_some());
        let customer_return = customer_return.unwrap().invoice_row;
        self.customer_return = Some(customer_return.clone());

        assert_eq!(customer_return.r#type, InvoiceType::CustomerReturn);
        assert_eq!(customer_return.store_id, self.outbound_store.id);
        assert_eq!(
            customer_return.name_id,
            self.inbound_store.name_id
        );
        assert_eq!(
            customer_return.name_store_id,
            Some(self.inbound_store.id.clone())
        );
        assert_eq!(
            customer_return.their_reference,
            Some("From invoice number: 5 (some return reference)".to_string())
        );
        assert_eq!(
            customer_return.transport_reference,
            self.supplier_return.transport_reference
        );
        assert_eq!(
            customer_return.comment,
            Some("Stock return (some return comment)".to_string())
        );
        assert_eq!(customer_return.colour, None);
        assert_eq!(customer_return.user_id, None);
        assert_eq!(customer_return.on_hold, false);
        assert_eq!(customer_return.allocated_datetime, None);

        assert_eq!(
            customer_return.original_shipment_id,
            Some(self.outbound_shipment.id.clone())
        );

        check_invoice_status(&customer_return, &self.supplier_return);

        assert_eq!(
            InvoiceLineRepository::new(connection)
                .count(Some(InvoiceLineFilter::new().invoice_id(
                    EqualFilter::equal_to(customer_return.id.to_string())
                )))
                .unwrap(),
            1
        );

        check_line(connection, &customer_return.id, &self.supplier_return_line);
    }

    pub(crate) fn check_supplier_return_was_linked(&self, connection: &StorageConnection) {
        let supplier_return = InvoiceRowRepository::new(connection)
            .find_one_by_id(&self.supplier_return.id)
            .unwrap();

        assert!(supplier_return.is_some());
        assert!(self.customer_return.is_some());

        assert_eq!(
            supplier_return.unwrap().linked_invoice_id,
            self.customer_return.clone().map(|r| r.id)
        );
    }

    pub(crate) fn delete_supplier_return(&self, service_provider: &ServiceProvider) {
        let ctx = service_provider
            .context(self.inbound_store.id.clone(), "".to_string())
            .unwrap();
        service_provider
            .invoice_service
            .delete_supplier_return(&ctx, self.supplier_return.id.clone())
            .unwrap();
    }

    pub(crate) fn check_customer_return_deleted(&mut self, connection: &StorageConnection) {
        let customer_return_id = &self.customer_return.clone().map(|r| r.id).unwrap();
        assert_eq!(
            InvoiceLineRepository::new(connection)
                .count(Some(InvoiceLineFilter::new().invoice_id(
                    EqualFilter::equal_to(customer_return_id.to_string())
                )))
                .unwrap(),
            0
        );

        assert_eq!(
            InvoiceRowRepository::new(connection)
                .find_one_by_id(customer_return_id)
                .unwrap(),
            None
        );
    }

    pub(crate) fn update_supplier_return_line(&mut self, service_provider: &ServiceProvider) {
        let ctx = service_provider
            .context(self.inbound_store.id.clone(), "".to_string())
            .unwrap();

        self.supplier_return_line = service_provider
            .invoice_line_service
            .update_stock_out_line(
                &ctx,
                UpdateStockOutLine {
                    id: self.supplier_return_line.id.clone(),
                    number_of_packs: Some(21.0),
                    r#type: Some(StockOutType::SupplierReturn),
                    ..Default::default()
                },
            )
            .unwrap()
            .invoice_line_row;
    }

    pub(crate) fn update_supplier_return_to_shipped(&mut self, service_provider: &ServiceProvider) {
        let ctx = service_provider
            .context(self.inbound_store.id.clone(), "".to_string())
            .unwrap();

        self.supplier_return = service_provider
            .invoice_service
            .update_supplier_return(
                &ctx,
                UpdateSupplierReturn {
                    supplier_return_id: self.supplier_return.id.clone(),
                    status: Some(UpdateSupplierReturnStatus::Shipped),
                    ..Default::default()
                },
            )
            .unwrap()
            .invoice_row;
    }

    pub(crate) fn check_customer_return_was_updated(&mut self, connection: &StorageConnection) {
        let customer_return = InvoiceRowRepository::new(connection)
            .find_one_by_id(&self.customer_return.clone().map(|r| r.id).unwrap())
            .unwrap();

        assert!(customer_return.is_some());
        let customer_return = customer_return.unwrap();

        assert_eq!(customer_return, {
            let mut r = customer_return.clone();
            r.status = InvoiceStatus::Shipped;
            r.shipped_datetime = self.supplier_return.shipped_datetime;
            r
        });

        assert_eq!(
            InvoiceLineRepository::new(connection)
                .count(Some(InvoiceLineFilter::new().invoice_id(
                    EqualFilter::equal_to(customer_return.id.to_string())
                )))
                .unwrap(),
            1
        );

        check_line(connection, &customer_return.id, &self.supplier_return_line);

        self.inbound_shipment = Some(customer_return)
    }

    pub(crate) fn update_customer_return_to_delivered(
        &mut self,
        service_provider: &ServiceProvider,
    ) {
        let ctx = service_provider
            .context(self.outbound_store.id.clone(), "".to_string())
            .unwrap();

        let customer_return = service_provider
            .invoice_service
            .update_customer_return(
                &ctx,
                UpdateCustomerReturn {
                    id: self.customer_return.clone().map(|r| r.id).unwrap(),
                    status: Some(UpdateCustomerReturnStatus::Received),
                    ..Default::default()
                },
            )
            .unwrap();

        self.customer_return = Some(customer_return.invoice_row);
    }

    pub(crate) fn update_customer_return_to_verified(
        &mut self,
        service_provider: &ServiceProvider,
    ) {
        let ctx = service_provider
            .context(self.outbound_store.id.clone(), "".to_string())
            .unwrap();

        let customer_return = service_provider
            .invoice_service
            .update_customer_return(
                &ctx,
                UpdateCustomerReturn {
                    id: self.customer_return.clone().map(|r| r.id).unwrap(),
                    status: Some(UpdateCustomerReturnStatus::Verified),
                    ..Default::default()
                },
            )
            .unwrap();

        self.customer_return = Some(customer_return.invoice_row);
    }

    pub(crate) fn check_supplier_return_status_matches_customer_return(
        &mut self,
        connection: &StorageConnection,
    ) {
        let supplier_return = InvoiceRowRepository::new(connection)
            .find_one_by_id(&self.supplier_return.id)
            .unwrap();

        assert!(supplier_return.is_some());
        check_invoice_status(
            &supplier_return.unwrap(),
            &self.customer_return.clone().unwrap(),
        )
    }
}

fn check_invoice_status(invoice1: &InvoiceRow, invoice2: &InvoiceRow) {
    assert_eq!(invoice1.status, invoice2.status);
    assert_eq!(invoice1.picked_datetime, invoice2.picked_datetime);
    assert_eq!(invoice1.shipped_datetime, invoice2.shipped_datetime);
    assert_eq!(invoice1.verified_datetime, invoice2.verified_datetime);
    assert_eq!(invoice1.received_datetime, invoice2.received_datetime);
}
/// Line uniqueness is checked in caller method where invoice line count is checked
fn check_line(connection: &StorageConnection, inbound_id: &str, outbound_line: &InvoiceLineRow) {
    let inbound_line = InvoiceLineRepository::new(connection)
        .query_one(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(inbound_id.to_string()))
                .item_id(EqualFilter::equal_to(
                    outbound_line.item_link_id.to_string(),
                )),
        )
        .unwrap();

    assert!(inbound_line.is_some());
    let inbound_line = inbound_line.unwrap().invoice_line_row;

    assert_eq!(inbound_line.item_name, outbound_line.item_name);
    assert_eq!(inbound_line.item_code, outbound_line.item_code);
    assert_eq!(inbound_line.batch, outbound_line.batch);
    assert_eq!(inbound_line.expiry_date, outbound_line.expiry_date);
    assert_eq!(inbound_line.pack_size, outbound_line.pack_size);
    assert_eq!(inbound_line.number_of_packs, outbound_line.number_of_packs);
    assert_eq!(inbound_line.note, outbound_line.note);
    assert_eq!(inbound_line.stock_line_id, None);
    assert_eq!(inbound_line.location_id, None);
    assert_eq!(inbound_line.tax_percentage, outbound_line.tax_percentage);
}

// Check pricing is calculated correctly for each line
fn check_line_pricing(
    connection: &StorageConnection,
    inbound_id: &str,
    inbound_store: &str,
    outbound_line: &InvoiceLineRow,
    item_id: String,
    outbound_name: Option<&NameRow>,
) {
    let inbound_line = InvoiceLineRepository::new(connection)
        .query_one(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(inbound_id.to_string()))
                .item_id(EqualFilter::equal_to(
                    outbound_line.item_link_id.to_string(),
                )),
        )
        .unwrap();

    assert!(inbound_line.is_some());
    let inbound_line = inbound_line.unwrap().invoice_line_row;

    let item = ItemRowRepository::new(connection)
        .find_one_by_item_link_id(&item_id)
        .unwrap_or(None);

    let item_properties = ItemStoreJoinRowRepository::new(connection)
        .find_one_by_item_and_store_id(&item_id, inbound_store)
        .unwrap_or(None);

    let default_sell_price_per_pack = item_properties
        .as_ref()
        .map_or(0.0, |i| i.default_sell_price_per_pack);

    let margin = item_properties.as_ref().map_or(0.0, |i| i.margin);

    let default_pack_size = item.as_ref().map_or(0.0, |i| i.default_pack_size);

    match outbound_line.r#type {
        InvoiceLineType::Service => {
            assert_eq!(inbound_line.r#type, InvoiceLineType::Service);
            assert_eq!(
                inbound_line.total_before_tax,
                outbound_line.total_before_tax
            );
            assert_approx_eq::assert_approx_eq!(
                inbound_line.total_after_tax,
                outbound_line.total_after_tax
            );
        }
        _ => {
            assert_eq!(inbound_line.r#type, InvoiceLineType::StockIn);
            assert_eq!(
                inbound_line.total_before_tax,
                outbound_line.sell_price_per_pack * outbound_line.number_of_packs
            );
            assert_eq!(
                inbound_line.total_after_tax,
                outbound_line.sell_price_per_pack * outbound_line.number_of_packs
            );
        }
    }

    assert_eq!(
        inbound_line.cost_price_per_pack,
        outbound_line.sell_price_per_pack
    );

    if default_sell_price_per_pack > 0.0 {
        let price_per_new_pack =
            (default_sell_price_per_pack / default_pack_size) * inbound_line.pack_size;

        assert_eq!(inbound_line.sell_price_per_pack, price_per_new_pack)
    } else if margin > 0.0 {
        let supplier_id = outbound_name.map_or_else(|| String::new(), |n| n.id.clone());
        let margin_price = get_cost_plus_margin(
            connection,
            inbound_line.cost_price_per_pack,
            item_properties,
            &supplier_id,
        )
        .unwrap();

        assert_eq!(inbound_line.sell_price_per_pack, margin_price)
    } else {
        assert_eq!(
            inbound_line.sell_price_per_pack,
            inbound_line.cost_price_per_pack
        )
    };
}
