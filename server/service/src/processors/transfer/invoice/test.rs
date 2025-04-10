use chrono::NaiveDate;
use repository::{
    mock::{insert_extra_mock_data, MockData, MockDataInserts},
    EqualFilter, InvoiceFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    InvoiceLineRowRepository, InvoiceLineType, InvoiceRepository, InvoiceRow, InvoiceRowRepository,
    InvoiceStatus, InvoiceType, ItemRow, KeyType, KeyValueStoreRow, LocationRow, NameLinkRow,
    NameRow, RequisitionFilter, RequisitionRepository, RequisitionRow, RequisitionRowRepository,
    RequisitionStatus, RequisitionType, StockLineRow, StorageConnection, StoreRow,
};
use util::{inline_edit, inline_init, uuid::uuid};

use crate::{
    invoice::{
        customer_return::{UpdateCustomerReturn, UpdateCustomerReturnStatus},
        inbound_shipment::{UpdateInboundShipment, UpdateInboundShipmentStatus},
        outbound_shipment::update::{UpdateOutboundShipment, UpdateOutboundShipmentStatus},
        supplier_return::update::{UpdateSupplierReturn, UpdateSupplierReturnStatus},
    },
    invoice_line::stock_out_line::{StockOutType, UpdateStockOutLine},
    processors::test_helpers::exec_concurrent,
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
    let outbound_store_name = inline_init(|r: &mut NameRow| {
        r.id = uuid();
        r.name = uuid();
    });

    let outbound_store = inline_init(|r: &mut StoreRow| {
        r.id = uuid();
        r.name_link_id.clone_from(&outbound_store_name.id);
        r.site_id = site_id;
    });

    let inbound_store_name = inline_init(|r: &mut NameRow| {
        r.id = uuid();
        r.name = uuid();
    });

    let inbound_store = inline_init(|r: &mut StoreRow| {
        r.id = uuid();
        r.name_link_id.clone_from(&inbound_store_name.id);
        r.site_id = site_id;
    });

    let item1 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let item2 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let service_item = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let site_id_settings = inline_init(|r: &mut KeyValueStoreRow| {
        r.id = KeyType::SettingsSyncSiteId;
        r.value_int = Some(site_id);
    });

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
        inline_init(|r: &mut MockData| {
            r.names = vec![inbound_store_name.clone(), outbound_store_name.clone()];
            r.stores = vec![inbound_store.clone(), outbound_store.clone()];
            r.items = vec![item1.clone(), item2.clone(), service_item.clone()];
            r.key_value_store_rows = vec![site_id_settings];
        }),
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

    let outbound_store_name = inline_init(|r: &mut NameRow| {
        r.id = uuid();
        r.name = uuid();
    });

    let outbound_store = inline_init(|r: &mut StoreRow| {
        r.id = uuid();
        r.name_link_id.clone_from(&outbound_store_name.id);
        r.site_id = site_id;
    });

    let inbound_store_name = inline_init(|r: &mut NameRow| {
        r.id = uuid();
        r.name = uuid();
    });

    let inbound_store = inline_init(|r: &mut StoreRow| {
        r.id = uuid();
        r.name_link_id.clone_from(&inbound_store_name.id);
        r.site_id = site_id;
    });

    let merge_name = inline_init(|r: &mut NameRow| {
        r.id = uuid();
        r.name = uuid();
    });

    let merge_name_link = inline_init(|r: &mut NameLinkRow| {
        r.id.clone_from(&merge_name.id);
        r.name_id.clone_from(&inbound_store_name.id);
    });

    let item1 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let item2 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let service_item = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let site_id_settings = inline_init(|r: &mut KeyValueStoreRow| {
        r.id = KeyType::SettingsSyncSiteId;
        r.value_int = Some(site_id);
    });

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
        inline_init(|r: &mut MockData| {
            r.names = vec![
                inbound_store_name.clone(),
                outbound_store_name.clone(),
                merge_name.clone(),
            ];
            r.stores = vec![inbound_store.clone(), outbound_store.clone()];
            r.items = vec![item1.clone(), item2.clone(), service_item.clone()];
            r.key_value_store_rows = vec![site_id_settings];
            r.name_links = vec![merge_name_link.clone()] // name_link is processed after the names. Updates the existing name link created for the name, effectively merging it.
        }),
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
    outbound_shipment_unallocated_line: InvoiceLineRow,
    outbound_shipment_service_line: InvoiceLineRow,
    supplier_return_line: InvoiceLineRow,
    supplier_return: InvoiceRow,
    outbound_shipment: InvoiceRow,
    customer_return: Option<InvoiceRow>,
    inbound_shipment: Option<InvoiceRow>,
    response_requisition: Option<RequisitionRow>,
    extra_mock_data: MockData,
}

impl InvoiceTransferTester {
    pub(crate) fn new(
        outbound_store: &StoreRow,
        inbound_store: &StoreRow,
        outbound_name: Option<&NameRow>,
        inbound_name: Option<&NameRow>,
        item1: &ItemRow,
        item2: &ItemRow,
        service_item: &ItemRow,
    ) -> InvoiceTransferTester {
        let request_requisition = inline_init(|r: &mut RequisitionRow| {
            r.id = uuid();
            r.name_link_id.clone_from(&outbound_store.name_link_id);
            r.store_id.clone_from(&inbound_store.id);
            r.r#type = RequisitionType::Request;
            r.status = RequisitionStatus::Draft;
        });

        let outbound_shipment = inline_init(|r: &mut InvoiceRow| {
            r.id = uuid();
            r.name_link_id =
                inbound_name.map_or(inbound_store.name_link_id.clone(), |n| n.id.clone());
            r.store_id.clone_from(&outbound_store.id);
            r.invoice_number = 20;
            r.r#type = InvoiceType::OutboundShipment;
            r.status = InvoiceStatus::Allocated;
            r.their_reference = Some("some reference".to_string());
            r.comment = Some("some comment".to_string());
            r.created_datetime = NaiveDate::from_ymd_opt(2024, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap();
            r.tax_percentage = Some(0.0);
        });

        let location = inline_init(|r: &mut LocationRow| {
            r.id = uuid();
            r.store_id.clone_from(&outbound_store.id)
        });

        let stock_line1 = inline_init(|r: &mut StockLineRow| {
            r.id = uuid();
            r.store_id.clone_from(&outbound_store.id);
            r.item_link_id.clone_from(&item1.id);
            r.batch = Some(uuid());
            r.expiry_date = Some(NaiveDate::from_ymd_opt(2025, 3, 1).unwrap());
            r.pack_size = 10.0;
            r.total_number_of_packs = 200.0;
            r.available_number_of_packs = 200.0;
        });

        let outbound_shipment_line1 = inline_init(|r: &mut InvoiceLineRow| {
            r.id = uuid();
            r.invoice_id.clone_from(&outbound_shipment.id);
            r.r#type = InvoiceLineType::StockOut;
            r.pack_size = stock_line1.pack_size;
            r.number_of_packs = 2.0;
            r.item_link_id.clone_from(&item1.id);
            r.item_name.clone_from(&item1.name);
            r.item_code.clone_from(&item1.code);
            r.cost_price_per_pack = 20.0;
            r.sell_price_per_pack = 10.0;
            r.batch.clone_from(&stock_line1.batch);
            r.expiry_date = stock_line1.expiry_date;
            r.stock_line_id = Some(stock_line1.id.clone());
            r.location_id = Some(location.id.clone());
            r.tax_percentage = Some(0.0);
        });

        let stock_line2 = inline_init(|r: &mut StockLineRow| {
            r.id = uuid();
            r.store_id.clone_from(&outbound_store.id);
            r.item_link_id.clone_from(&item2.id);
            r.batch = Some(uuid());
            r.pack_size = 10.0;
            r.total_number_of_packs = 200.0;
            r.available_number_of_packs = 200.0;
            r.expiry_date = Some(NaiveDate::from_ymd_opt(2023, 1, 5).unwrap());
        });

        let outbound_shipment_line2 = inline_init(|r: &mut InvoiceLineRow| {
            r.id = uuid();
            r.invoice_id.clone_from(&outbound_shipment.id);
            r.r#type = InvoiceLineType::StockOut;
            r.pack_size = stock_line2.pack_size;
            r.number_of_packs = 6.0;
            r.item_link_id.clone_from(&item2.id);
            r.item_name.clone_from(&item2.name);
            r.item_code.clone_from(&item2.code);
            r.cost_price_per_pack = 15.0;
            r.sell_price_per_pack = 35.0;
            r.batch.clone_from(&stock_line2.batch);
            r.expiry_date = stock_line2.expiry_date;
            r.stock_line_id = Some(stock_line2.id.clone());
            r.tax_percentage = Some(0.0);
            // Location todo
        });

        let outbound_shipment_service_line = inline_init(|r: &mut InvoiceLineRow| {
            r.id = uuid();
            r.invoice_id.clone_from(&outbound_shipment.id);
            r.r#type = InvoiceLineType::Service;
            r.item_link_id.clone_from(&service_item.id);
            r.item_name.clone_from(&service_item.name);
            r.item_code.clone_from(&service_item.code);
            r.total_before_tax = 100.0;
            r.total_after_tax = 110.0;
            r.tax_percentage = Some(10.0);
            // Location todo
        });

        let outbound_shipment_unallocated_line = inline_init(|r: &mut InvoiceLineRow| {
            r.id = uuid();
            r.invoice_id.clone_from(&outbound_shipment.id);
            r.r#type = InvoiceLineType::UnallocatedStock;
            r.pack_size = 1.0;
            r.number_of_packs = 10.0;
            r.item_link_id.clone_from(&item2.id);
            r.item_name.clone_from(&item2.name);
            r.item_code.clone_from(&item2.code);
            r.tax_percentage = Some(0.0);
        });

        let supplier_return = inline_init(|r: &mut InvoiceRow| {
            r.id = uuid();
            r.name_link_id =
                outbound_name.map_or(outbound_store.name_link_id.clone(), |n| n.id.clone());
            r.store_id.clone_from(&inbound_store.id);
            r.invoice_number = 5;
            r.r#type = InvoiceType::SupplierReturn;
            r.status = InvoiceStatus::New;
            r.their_reference = Some("some return reference".to_string());
            r.comment = Some("some return comment".to_string());
            r.created_datetime = NaiveDate::from_ymd_opt(2024, 1, 1)
                .unwrap()
                .and_hms_milli_opt(13, 00, 0, 0)
                .unwrap();
        });

        let supplier_return_line = inline_init(|r: &mut InvoiceLineRow| {
            r.id = uuid();
            r.invoice_id.clone_from(&supplier_return.id);
            r.r#type = InvoiceLineType::StockOut;
            r.pack_size = stock_line1.pack_size;
            r.number_of_packs = 2.0;
            r.item_link_id.clone_from(&item1.id);
            r.item_name.clone_from(&item1.name);
            r.item_code.clone_from(&item1.code);
            r.cost_price_per_pack = 20.0;
            r.sell_price_per_pack = 10.0;
            r.batch.clone_from(&stock_line1.batch);
            r.expiry_date = stock_line1.expiry_date;
            r.stock_line_id = Some(stock_line1.id.clone());
            r.location_id = Some(location.id.clone());
            r.tax_percentage = Some(0.0);
        });

        InvoiceTransferTester {
            outbound_store: outbound_store.clone(),
            inbound_store: inbound_store.clone(),
            request_requisition,
            outbound_shipment_line1,
            outbound_shipment_line2,
            outbound_shipment_unallocated_line,
            outbound_shipment_service_line,
            supplier_return_line,
            supplier_return,
            outbound_shipment,
            customer_return: None,
            inbound_shipment: None,
            response_requisition: None,
            extra_mock_data: inline_init(|r: &mut MockData| {
                r.stock_lines = vec![stock_line1, stock_line2];
                r.locations = vec![location];
            }),
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
                inline_init(|r: &mut UpdateRequestRequisition| {
                    r.id.clone_from(&self.request_requisition.id);
                    r.status = Some(UpdateRequestRequisitionStatus::Sent);
                }),
            )
            .unwrap();
    }

    pub(crate) fn check_response_requisition_created(&mut self, connection: &StorageConnection) {
        let response_requisition = RequisitionRepository::new(connection)
            .query_one(
                RequisitionFilter::new()
                    .linked_requisition_id(EqualFilter::equal_to(&self.request_requisition.id)),
            )
            .unwrap();
        assert!(response_requisition.is_some());
        self.response_requisition = Some(response_requisition.unwrap().requisition_row);
    }

    pub(crate) fn insert_outbound_shipment(&self, connection: &StorageConnection) {
        let response_requisition_id = self.response_requisition.clone().map(|r| r.id);
        insert_extra_mock_data(
            connection,
            inline_init(|r: &mut MockData| {
                r.invoices = vec![inline_edit(&self.outbound_shipment, |mut r| {
                    r.requisition_id = response_requisition_id;
                    r
                })];
                r.invoice_lines = vec![
                    self.outbound_shipment_line1.clone(),
                    self.outbound_shipment_line2.clone(),
                    self.outbound_shipment_service_line.clone(),
                ]
            })
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
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id.clone_from(&self.outbound_shipment.id);
                    r.status = Some(UpdateOutboundShipmentStatus::Picked);
                }),
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
            inbound_shipment.name_link_id,
            self.outbound_store.name_link_id
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
                .count(Some(
                    InvoiceLineFilter::new()
                        .invoice_id(EqualFilter::equal_to(&inbound_shipment.id))
                ))
                .unwrap(),
            3
        );

        check_line(
            connection,
            &inbound_shipment.id,
            &self.outbound_shipment_line1,
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
                .count(Some(
                    InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(inbound_shipment_id))
                ))
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
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id.clone_from(&self.outbound_shipment_line2.id);
                    r.number_of_packs = Some(21.0);
                    r.r#type = Some(StockOutType::OutboundShipment);
                }),
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
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id.clone_from(&self.outbound_shipment.id);
                    r.their_reference = Some("some updated reference".to_string());
                    r.status = Some(UpdateOutboundShipmentStatus::Shipped);
                }),
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

        assert_eq!(
            inbound_shipment,
            inline_edit(&inbound_shipment, |mut r| {
                r.status = InvoiceStatus::Shipped;
                r.shipped_datetime = self.outbound_shipment.shipped_datetime;
                r.their_reference =
                    Some("From invoice number: 20 (some updated reference)".to_string());
                r
            })
        );

        assert_eq!(
            InvoiceLineRepository::new(connection)
                .count(Some(
                    InvoiceLineFilter::new()
                        .invoice_id(EqualFilter::equal_to(&inbound_shipment.id))
                ))
                .unwrap(),
            2
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
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = self.inbound_shipment.clone().map(|r| r.id).unwrap();
                    r.status = Some(UpdateInboundShipmentStatus::Delivered);
                }),
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
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = self.inbound_shipment.clone().map(|r| r.id).unwrap();
                    r.status = Some(UpdateInboundShipmentStatus::Verified);
                }),
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
            inline_init(|r: &mut MockData| {
                r.invoices = vec![inline_edit(&self.supplier_return, |mut r| {
                    r.original_shipment_id = inbound_shipment_id;
                    r
                })];
                r.invoice_lines = vec![self.supplier_return_line.clone()]
            })
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
                inline_init(|r: &mut UpdateSupplierReturn| {
                    r.supplier_return_id.clone_from(&self.supplier_return.id);
                    r.status = Some(UpdateSupplierReturnStatus::Picked);
                }),
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
            customer_return.name_link_id,
            self.inbound_store.name_link_id
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
                .count(Some(
                    InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&customer_return.id))
                ))
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
                .count(Some(
                    InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(customer_return_id))
                ))
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
                inline_init(|r: &mut UpdateStockOutLine| {
                    r.id.clone_from(&self.supplier_return_line.id);
                    r.number_of_packs = Some(21.0);
                    r.r#type = Some(StockOutType::SupplierReturn);
                }),
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
                inline_init(|r: &mut UpdateSupplierReturn| {
                    r.supplier_return_id.clone_from(&self.supplier_return.id);
                    r.status = Some(UpdateSupplierReturnStatus::Shipped);
                }),
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

        assert_eq!(
            customer_return,
            inline_edit(&customer_return, |mut r| {
                r.status = InvoiceStatus::Shipped;
                r.shipped_datetime = self.supplier_return.shipped_datetime;
                r
            })
        );

        assert_eq!(
            InvoiceLineRepository::new(connection)
                .count(Some(
                    InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&customer_return.id))
                ))
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
                inline_init(|r: &mut UpdateCustomerReturn| {
                    r.id = self.customer_return.clone().map(|r| r.id).unwrap();
                    r.status = Some(UpdateCustomerReturnStatus::Delivered);
                }),
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
                inline_init(|r: &mut UpdateCustomerReturn| {
                    r.id = self.customer_return.clone().map(|r| r.id).unwrap();
                    r.status = Some(UpdateCustomerReturnStatus::Verified);
                }),
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
    assert_eq!(invoice1.delivered_datetime, invoice2.delivered_datetime);
}

/// Line uniqueness is checked in caller method where invoice line count is checked
fn check_line(connection: &StorageConnection, inbound_id: &str, outbound_line: &InvoiceLineRow) {
    let inbound_line = InvoiceLineRepository::new(connection)
        .query_one(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(inbound_id))
                .item_id(EqualFilter::equal_to(&outbound_line.item_link_id)),
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
    assert_eq!(inbound_line.stock_line_id, None);
    assert_eq!(inbound_line.location_id, None);
    assert_eq!(
        inbound_line.sell_price_per_pack,
        outbound_line.sell_price_per_pack
    );
    assert_eq!(inbound_line.tax_percentage, outbound_line.tax_percentage);
}
