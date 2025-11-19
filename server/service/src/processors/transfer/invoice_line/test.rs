use crate::{
    invoice::outbound_shipment::update::{UpdateOutboundShipment, UpdateOutboundShipmentStatus},
    invoice_line::stock_out_line::{
        DeleteStockOutLine, InsertStockOutLine, StockOutType, UpdateStockOutLine,
    },
    processors::test_helpers::exec_concurrent,
    service_provider::ServiceProvider,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};
use repository::{
    mock::{MockData, MockDataInserts},
    EqualFilter, InvoiceFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    InvoiceLineType, InvoiceRepository, InvoiceRow, InvoiceStatus, InvoiceType, ItemRow, KeyType,
    KeyValueStoreRow, NameRow, StockLineRow, StockLineRowRepository, StorageConnection, StoreRow,
};
use util::uuid::uuid;

/// Test that invoice line changes trigger the processor and update inbound invoices
#[tokio::test(flavor = "multi_thread", worker_threads = 3)]
async fn invoice_line_transfers() {
    let site_id = 25;

    let outbound_store_name = NameRow {
        id: uuid(),
        name: uuid(),
        ..Default::default()
    };

    let outbound_store = StoreRow {
        id: uuid(),
        name_link_id: outbound_store_name.id.clone(),
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
        name_link_id: inbound_store_name.id.clone(),
        site_id,
        ..Default::default()
    };

    let item1 = ItemRow {
        id: uuid(),
        default_pack_size: 10.0,
        ..Default::default()
    };

    let site_id_settings = KeyValueStoreRow {
        id: KeyType::SettingsSyncSiteId,
        value_int: Some(site_id),
        ..Default::default()
    };

    let ServiceTestContext {
        service_provider,
        processors_task,
        ..
    } = setup_all_with_data_and_service_provider(
        "invoice_line_transfers",
        MockDataInserts::none()
            .stores()
            .names()
            .items()
            .units()
            .currencies(),
        MockData {
            names: vec![inbound_store_name.clone(), outbound_store_name.clone()],
            stores: vec![inbound_store.clone(), outbound_store.clone()],
            items: vec![item1.clone()],
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
                _outbound_store_name,
                item1,
            ) = test_input;

            let ctx = service_provider.basic_context().unwrap();

            let mut tester = InvoiceLineTransferTester::new(
                &outbound_store,
                &inbound_store,
                &inbound_store_name,
                &item1,
            );

            // Test full flow: create → update → delete
            tester.insert_outbound_shipment(&ctx.connection);
            tester.add_outbound_line(&service_provider);

            tester.update_outbound_shipment_to_picked(&service_provider);
            ctx.processors_trigger.await_events_processed().await;

            tester.check_inbound_shipment_created(&ctx.connection);
            tester.check_two_inbound_lines_created(&ctx.connection);

            tester.update_outbound_line(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_inbound_line_updated(&ctx.connection);

            tester.delete_outbound_line(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            tester.check_inbound_line_deleted(&ctx.connection);
        },
    );

    tokio::select! {
        Err(err) = processors_task => unreachable!("{}", err),
        _ = test_handle => (),
    };
}

/// Test that multiple batches of the same item are handled correctly
#[tokio::test(flavor = "multi_thread", worker_threads = 3)]
async fn invoice_line_transfers_multiple_batches() {
    let site_id = 26;

    let outbound_store_name = NameRow {
        id: uuid(),
        name: uuid(),
        ..Default::default()
    };

    let outbound_store = StoreRow {
        id: uuid(),
        name_link_id: outbound_store_name.id.clone(),
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
        name_link_id: inbound_store_name.id.clone(),
        site_id,
        ..Default::default()
    };

    let item1 = ItemRow {
        id: uuid(),
        default_pack_size: 10.0,
        ..Default::default()
    };

    let site_id_settings = KeyValueStoreRow {
        id: KeyType::SettingsSyncSiteId,
        value_int: Some(site_id),
        ..Default::default()
    };

    let ServiceTestContext {
        service_provider,
        processors_task,
        ..
    } = setup_all_with_data_and_service_provider(
        "invoice_line_transfers_multiple_batches",
        MockDataInserts::none()
            .stores()
            .names()
            .items()
            .units()
            .currencies(),
        MockData {
            names: vec![inbound_store_name.clone(), outbound_store_name.clone()],
            stores: vec![inbound_store.clone(), outbound_store.clone()],
            items: vec![item1.clone()],
            key_value_store_rows: vec![site_id_settings],
            ..Default::default()
        },
    )
    .await;

    let test_handle = tokio::spawn(async move {
        let ctx = service_provider.basic_context().unwrap();

        // Create shipment with 2 lines of same item, different batches
        let mut tester = InvoiceLineTransferTester::new_with_multiple_batches(
            &outbound_store,
            &inbound_store,
            &inbound_store_name,
            &item1,
        );

        tester.insert_outbound_shipment_with_two_batches(&ctx.connection);
        tester.update_outbound_shipment_to_picked(&service_provider);
        ctx.processors_trigger.await_events_processed().await;

        tester.check_two_inbound_lines_created(&ctx.connection);

        tester.delete_first_batch(&service_provider);
        ctx.processors_trigger.await_events_processed().await;

        tester.check_first_batch_deleted_second_remains(&ctx.connection);
    });

    tokio::select! {
        Err(err) = processors_task => unreachable!("{}", err),
        _ = test_handle => {},
    };
}

/// Simulates invoice line transfer flow
#[allow(dead_code)]
struct InvoiceLineTransferTester {
    outbound_store: StoreRow,
    inbound_store: StoreRow,
    outbound_invoice: InvoiceRow,
    inbound_invoice: Option<InvoiceRow>,
    outbound_line: InvoiceLineRow,
    outbound_line_batch2: Option<InvoiceLineRow>,
    stock_line: StockLineRow,
    stock_line_batch2: Option<StockLineRow>,
    extra_mock_data: MockData,
}

impl InvoiceLineTransferTester {
    fn new(
        outbound_store: &StoreRow,
        inbound_store: &StoreRow,
        inbound_name: &NameRow,
        item: &ItemRow,
    ) -> Self {
        let outbound_invoice = InvoiceRow {
            id: uuid(),
            name_link_id: inbound_name.id.clone(),
            store_id: outbound_store.id.clone(),
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::Allocated,
            ..Default::default()
        };

        let stock_line = StockLineRow {
            id: uuid(),
            store_id: outbound_store.id.clone(),
            item_link_id: item.id.clone(),
            batch: Some("batch1".to_string()),
            pack_size: 10.0,
            total_number_of_packs: 100.0,
            available_number_of_packs: 100.0,
            ..Default::default()
        };

        let outbound_line = InvoiceLineRow {
            id: uuid(),
            invoice_id: outbound_invoice.id.clone(),
            item_link_id: item.id.clone(),
            item_name: item.name.clone(),
            item_code: item.code.clone(),
            r#type: InvoiceLineType::StockOut,
            pack_size: stock_line.pack_size,
            number_of_packs: 10.0,
            batch: stock_line.batch.clone(),
            stock_line_id: Some(stock_line.id.clone()),
            ..Default::default()
        };

        Self {
            outbound_store: outbound_store.clone(),
            inbound_store: inbound_store.clone(),
            outbound_invoice,
            inbound_invoice: None,
            outbound_line,
            outbound_line_batch2: None,
            stock_line: stock_line.clone(),
            stock_line_batch2: None,
            extra_mock_data: MockData {
                stock_lines: vec![stock_line],
                ..Default::default()
            },
        }
    }

    /// Create tester with two batches of the same item
    fn new_with_multiple_batches(
        outbound_store: &StoreRow,
        inbound_store: &StoreRow,
        inbound_name: &NameRow,
        item: &ItemRow,
    ) -> Self {
        let outbound_invoice = InvoiceRow {
            id: uuid(),
            name_link_id: inbound_name.id.clone(),
            store_id: outbound_store.id.clone(),
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::Allocated,
            ..Default::default()
        };

        // First batch
        let stock_line_batch1 = StockLineRow {
            id: uuid(),
            store_id: outbound_store.id.clone(),
            item_link_id: item.id.clone(),
            batch: Some("batch1".to_string()),
            pack_size: 10.0,
            total_number_of_packs: 100.0,
            available_number_of_packs: 100.0,
            ..Default::default()
        };

        let outbound_line_batch1 = InvoiceLineRow {
            id: uuid(),
            invoice_id: outbound_invoice.id.clone(),
            item_link_id: item.id.clone(),
            item_name: item.name.clone(),
            item_code: item.code.clone(),
            r#type: InvoiceLineType::StockOut,
            pack_size: stock_line_batch1.pack_size,
            number_of_packs: 10.0,
            batch: stock_line_batch1.batch.clone(),
            stock_line_id: Some(stock_line_batch1.id.clone()),
            ..Default::default()
        };

        // Second batch
        let stock_line_batch2 = StockLineRow {
            id: uuid(),
            store_id: outbound_store.id.clone(),
            item_link_id: item.id.clone(),
            batch: Some("batch2".to_string()),
            pack_size: 10.0,
            total_number_of_packs: 50.0,
            available_number_of_packs: 50.0,
            ..Default::default()
        };

        let outbound_line_batch2 = InvoiceLineRow {
            id: uuid(),
            invoice_id: outbound_invoice.id.clone(),
            item_link_id: item.id.clone(),
            item_name: item.name.clone(),
            item_code: item.code.clone(),
            r#type: InvoiceLineType::StockOut,
            pack_size: stock_line_batch2.pack_size,
            number_of_packs: 5.0,
            batch: stock_line_batch2.batch.clone(),
            stock_line_id: Some(stock_line_batch2.id.clone()),
            ..Default::default()
        };

        Self {
            outbound_store: outbound_store.clone(),
            inbound_store: inbound_store.clone(),
            outbound_invoice,
            inbound_invoice: None,
            outbound_line: outbound_line_batch1,
            outbound_line_batch2: Some(outbound_line_batch2),
            stock_line: stock_line_batch1.clone(),
            stock_line_batch2: Some(stock_line_batch2.clone()),
            extra_mock_data: MockData {
                stock_lines: vec![stock_line_batch1, stock_line_batch2],
                ..Default::default()
            },
        }
    }

    fn insert_outbound_shipment(&self, connection: &StorageConnection) {
        repository::mock::insert_extra_mock_data(
            connection,
            MockData {
                invoices: vec![self.outbound_invoice.clone()],
                invoice_lines: vec![self.outbound_line.clone()],
                ..Default::default()
            }
            .join(self.extra_mock_data.clone()),
        );
    }

    fn insert_outbound_shipment_with_two_batches(&self, connection: &StorageConnection) {
        let mut invoice_lines = vec![self.outbound_line.clone()];
        if let Some(ref line2) = self.outbound_line_batch2 {
            invoice_lines.push(line2.clone());
        }

        repository::mock::insert_extra_mock_data(
            connection,
            MockData {
                invoices: vec![self.outbound_invoice.clone()],
                invoice_lines,
                ..Default::default()
            }
            .join(self.extra_mock_data.clone()),
        );
    }

    fn update_outbound_shipment_to_picked(&mut self, service_provider: &ServiceProvider) {
        let ctx = service_provider
            .context(self.outbound_store.id.clone(), "".to_string())
            .unwrap();

        self.outbound_invoice = service_provider
            .invoice_service
            .update_outbound_shipment(
                &ctx,
                UpdateOutboundShipment {
                    id: self.outbound_invoice.id.clone(),
                    status: Some(UpdateOutboundShipmentStatus::Picked),
                    ..Default::default()
                },
            )
            .unwrap()
            .invoice_row;
    }

    fn check_inbound_shipment_created(&mut self, connection: &StorageConnection) {
        let inbound_invoice = InvoiceRepository::new(connection)
            .query_one(InvoiceFilter::new_match_linked_invoice_id(
                &self.outbound_invoice.id,
            ))
            .unwrap();

        assert!(inbound_invoice.is_some());
        self.inbound_invoice = Some(inbound_invoice.unwrap().invoice_row);
    }

    fn add_outbound_line(&mut self, service_provider: &ServiceProvider) {
        let ctx = service_provider
            .context(self.outbound_store.id.clone(), "".to_string())
            .unwrap();

        let stock_line_batch2 = StockLineRow {
            id: uuid(),
            store_id: self.outbound_store.id.clone(),
            item_link_id: self.outbound_line.item_link_id.clone(),
            batch: Some("batch2".to_string()),
            pack_size: 10.0,
            total_number_of_packs: 50.0,
            available_number_of_packs: 50.0,
            ..Default::default()
        };

        StockLineRowRepository::new(&ctx.connection)
            .upsert_one(&stock_line_batch2)
            .unwrap();

        let new_line = service_provider
            .invoice_line_service
            .insert_stock_out_line(
                &ctx,
                InsertStockOutLine {
                    id: uuid(),
                    invoice_id: self.outbound_invoice.id.clone(),
                    stock_line_id: stock_line_batch2.id.clone(),
                    number_of_packs: 5.0,
                    r#type: StockOutType::OutboundShipment,
                    ..Default::default()
                },
            )
            .unwrap()
            .invoice_line_row;

        self.outbound_line_batch2 = Some(new_line);
        self.stock_line_batch2 = Some(stock_line_batch2);
    }

    fn check_two_inbound_lines_created(&self, connection: &StorageConnection) {
        let inbound_lines = InvoiceLineRepository::new(connection)
            .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(
                &self.inbound_invoice.as_ref().unwrap().id,
            )))
            .unwrap();

        assert_eq!(inbound_lines.len(), 2);

        let batch1 = inbound_lines
            .iter()
            .find(|l| l.invoice_line_row.batch == Some("batch1".to_string()));
        assert!(batch1.is_some());
        assert_eq!(batch1.unwrap().invoice_line_row.number_of_packs, 10.0);

        let batch2 = inbound_lines
            .iter()
            .find(|l| l.invoice_line_row.batch == Some("batch2".to_string()));
        assert!(batch2.is_some());
        assert_eq!(batch2.unwrap().invoice_line_row.number_of_packs, 5.0);
    }

    fn update_outbound_line(&mut self, service_provider: &ServiceProvider) {
        let ctx = service_provider
            .context(self.outbound_store.id.clone(), "".to_string())
            .unwrap();

        self.outbound_line = service_provider
            .invoice_line_service
            .update_stock_out_line(
                &ctx,
                UpdateStockOutLine {
                    id: self.outbound_line.id.clone(),
                    number_of_packs: Some(20.0),
                    r#type: Some(StockOutType::OutboundShipment),
                    ..Default::default()
                },
            )
            .unwrap()
            .invoice_line_row;
    }

    fn check_inbound_line_updated(&self, connection: &StorageConnection) {
        let inbound_lines = InvoiceLineRepository::new(connection)
            .query_by_filter(
                InvoiceLineFilter::new()
                    .invoice_id(EqualFilter::equal_to(
                        &self.inbound_invoice.as_ref().unwrap().id,
                    ))
                    .item_id(EqualFilter::equal_to(&self.outbound_line.item_link_id)),
            )
            .unwrap();

        assert_eq!(inbound_lines.len(), 2);
        let batch1 = inbound_lines
            .iter()
            .find(|l| l.invoice_line_row.batch == Some("batch1".to_string()));
        assert!(batch1.is_some(), "Batch1 should exist");
        assert_eq!(batch1.unwrap().invoice_line_row.number_of_packs, 20.0);

        // Check batch2 is unchanged
        let batch2 = inbound_lines
            .iter()
            .find(|l| l.invoice_line_row.batch == Some("batch2".to_string()));
        assert!(batch2.is_some(), "Batch2 should still exist");
        assert_eq!(batch2.unwrap().invoice_line_row.number_of_packs, 5.0,);
    }

    fn delete_outbound_line(&self, service_provider: &ServiceProvider) {
        let ctx = service_provider
            .context(self.outbound_store.id.clone(), "".to_string())
            .unwrap();

        service_provider
            .invoice_line_service
            .delete_stock_out_line(
                &ctx,
                DeleteStockOutLine {
                    id: self.outbound_line.id.clone(),
                    r#type: Some(StockOutType::OutboundShipment),
                },
            )
            .unwrap();
    }

    fn delete_first_batch(&self, service_provider: &ServiceProvider) {
        let ctx = service_provider
            .context(self.outbound_store.id.clone(), "".to_string())
            .unwrap();

        service_provider
            .invoice_line_service
            .delete_stock_out_line(
                &ctx,
                DeleteStockOutLine {
                    id: self.outbound_line.id.clone(),
                    r#type: Some(StockOutType::OutboundShipment),
                },
            )
            .unwrap();
    }

    fn check_inbound_line_deleted(&self, connection: &StorageConnection) {
        let inbound_lines = InvoiceLineRepository::new(connection)
            .query_by_filter(
                InvoiceLineFilter::new()
                    .invoice_id(EqualFilter::equal_to(
                        &self.inbound_invoice.as_ref().unwrap().id,
                    ))
                    .item_id(EqualFilter::equal_to(&self.outbound_line.item_link_id)),
            )
            .unwrap();

        assert_eq!(inbound_lines.len(), 1);

        let remaining = &inbound_lines[0].invoice_line_row;
        assert_eq!(remaining.batch, Some("batch2".to_string()));
        assert_eq!(remaining.number_of_packs, 5.0);
    }

    fn check_first_batch_deleted_second_remains(&self, connection: &StorageConnection) {
        let inbound_lines = InvoiceLineRepository::new(connection)
            .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(
                &self.inbound_invoice.as_ref().unwrap().id,
            )))
            .unwrap();

        assert_eq!(inbound_lines.len(), 1);

        let remaining = &inbound_lines[0].invoice_line_row;
        assert_eq!(remaining.batch, Some("batch2".to_string()));
        assert_eq!(remaining.number_of_packs, 5.0);
    }
}
