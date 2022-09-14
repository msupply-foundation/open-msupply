use chrono::NaiveDate;
use repository::{
    mock::{insert_extra_mock_data, MockData, MockDataInserts},
    EqualFilter, InvoiceFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    InvoiceLineRowRepository, InvoiceLineRowType, InvoiceRepository, InvoiceRow,
    InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType, ItemRow, KeyValueStoreRow,
    KeyValueType, LocationRow, NameRow, RequisitionFilter, RequisitionRepository, RequisitionRow,
    RequisitionRowRepository, RequisitionRowStatus, RequisitionRowType, StockLineRow,
    StorageConnection, StoreRow,
};
use util::{inline_edit, inline_init, uuid::uuid};

use crate::{
    invoice::{
        inbound_shipment::{UpdateInboundShipment, UpdateInboundShipmentStatus},
        outbound_shipment::{UpdateOutboundShipment, UpdateOutboundShipmentStatus},
    },
    invoice_line::outbound_shipment_line::UpdateOutboundShipmentLine,
    processors::test_helpers::delay_for_processor,
    requisition::request_requisition::{UpdateRequestRequisition, UpdateRequestRequstionStatus},
    service_provider::ServiceProvider,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

#[actix_rt::test]
async fn invoice_transfers() {
    let site_id = 25;
    let outbound_store_name = inline_init(|r: &mut NameRow| {
        r.id = uuid();
        r.name = uuid();
    });

    let outbound_store = inline_init(|r: &mut StoreRow| {
        r.id = uuid();
        r.name_id = outbound_store_name.id.clone();
        r.site_id = site_id;
    });

    let inbound_store_name = inline_init(|r: &mut NameRow| {
        r.id = uuid();
        r.name = uuid();
    });

    let inbound_store = inline_init(|r: &mut StoreRow| {
        r.id = uuid();
        r.name_id = inbound_store_name.id.clone();
        r.site_id = site_id;
    });

    let item1 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let item2 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let site_id_settings = inline_init(|r: &mut KeyValueStoreRow| {
        r.id = KeyValueType::SettingsSyncSiteId;
        r.value_int = Some(site_id);
    });

    let ServiceTestContext {
        connection,
        service_provider,
        processors_task,
        ..
    } = setup_all_with_data_and_service_provider(
        "invoice_transfers",
        MockDataInserts::none().stores().names().items().units(),
        inline_init(|r: &mut MockData| {
            r.names = vec![inbound_store_name.clone(), outbound_store_name.clone()];
            r.stores = vec![inbound_store.clone(), outbound_store.clone()];
            r.items = vec![item1.clone(), item2.clone()];
            r.key_value_store_rows = vec![site_id_settings];
        }),
    )
    .await;

    let test = || async move {
        // Without delete
        let mut tester =
            ShipmentTransferTester::new(&inbound_store, &outbound_store, &item1, &item2);

        tester.insert_request_requisition(&service_provider).await;
        delay_for_processor().await;
        tester.check_response_requisition_created(&connection).await;
        tester.insert_outbound_shipment(&connection).await;
        delay_for_processor().await;
        tester.check_inbound_shipment_not_created(&connection);
        delay_for_processor().await;
        tester.update_outbound_shipment_to_picked(&service_provider);
        delay_for_processor().await;
        tester.check_inbound_shipment_created(&connection);
        delay_for_processor().await;
        tester.check_outbound_shipment_was_linked(&connection);
        delay_for_processor().await;
        tester.update_outbound_shipment_lines(&service_provider);
        delay_for_processor().await;
        tester.update_outbound_shipment_to_shipped(&service_provider);
        delay_for_processor().await;
        tester.check_inbound_shipment_was_updated(&connection);
        delay_for_processor().await;
        tester.update_inbound_shipment_to_delivered(&service_provider);
        delay_for_processor().await;
        tester.check_outbound_shipment_status_matches_inbound_shipment(&connection);
        delay_for_processor().await;
        tester.update_inbound_shipment_to_verified(&service_provider);
        delay_for_processor().await;
        tester.check_outbound_shipment_status_matches_inbound_shipment(&connection);
        delay_for_processor().await;

        // With delete
        let mut tester =
            ShipmentTransferTester::new(&inbound_store, &outbound_store, &item1, &item2);

        tester.insert_request_requisition(&service_provider).await;
        delay_for_processor().await;
        tester.check_response_requisition_created(&connection).await;
        tester.insert_outbound_shipment(&connection).await;
        delay_for_processor().await;
        tester.update_outbound_shipment_to_picked(&service_provider);
        delay_for_processor().await;
        tester.check_inbound_shipment_created(&connection);
        delay_for_processor().await;
        tester.delete_outbound_shipment(&service_provider);
        delay_for_processor().await;
        tester.check_inbound_shipment_deleted(&connection);
    };

    tokio::select! {
        Err(err) = processors_task => unreachable!("{}", err),
        _ = test() => (),
    };
}
pub(crate) struct ShipmentTransferTester {
    // TODO linked requisitions ?
    outbound_store: StoreRow,
    inbound_store: StoreRow,
    request_requisition: RequisitionRow,
    outbound_shipment_line1: InvoiceLineRow,
    outbound_shipment_line2: InvoiceLineRow,
    outbound_shipment: InvoiceRow,
    inbound_shipment: Option<InvoiceRow>,
    response_requisition: Option<RequisitionRow>,
    extra_mock_data: MockData,
}

impl ShipmentTransferTester {
    pub(crate) fn new(
        outbound_store: &StoreRow,
        inbound_store: &StoreRow,
        item1: &ItemRow,
        item2: &ItemRow,
    ) -> ShipmentTransferTester {
        let request_requisition = inline_init(|r: &mut RequisitionRow| {
            r.id = uuid();
            r.name_id = outbound_store.name_id.clone();
            r.store_id = inbound_store.id.clone();
            r.r#type = RequisitionRowType::Request;
            r.status = RequisitionRowStatus::Draft;
        });

        let outbound_shipment = inline_init(|r: &mut InvoiceRow| {
            r.id = uuid();
            r.name_id = inbound_store.name_id.clone();
            r.store_id = outbound_store.id.clone();
            r.invoice_number = 20;
            r.r#type = InvoiceRowType::OutboundShipment;
            r.status = InvoiceRowStatus::Allocated;
            r.their_reference = Some("some reference".to_string());
            r.created_datetime = NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0);
        });

        let location = inline_init(|r: &mut LocationRow| {
            r.id = uuid();
            r.store_id = outbound_store.id.clone()
        });

        let stock_line1 = inline_init(|r: &mut StockLineRow| {
            r.id = uuid();
            r.item_id = uuid();
            r.store_id = outbound_store.id.clone();
            r.item_id = item1.id.clone();
            r.batch = Some(uuid());
            r.expiry_date = Some(NaiveDate::from_ymd(2025, 3, 1));
            r.pack_size = 10;
            r.total_number_of_packs = 200;
            r.available_number_of_packs = 200;
        });

        let outbound_shipment_line1 = inline_init(|r: &mut InvoiceLineRow| {
            r.id = uuid();
            r.invoice_id = outbound_shipment.id.clone();
            r.r#type = InvoiceLineRowType::StockOut;
            r.pack_size = stock_line1.pack_size;
            r.number_of_packs = 2;
            r.item_id = item1.id.clone();
            r.item_name = item1.name.clone();
            r.item_code = item1.code.clone();
            r.cost_price_per_pack = 20.0;
            r.sell_price_per_pack = 10.0;
            r.batch = stock_line1.batch.clone();
            r.expiry_date = stock_line1.expiry_date.clone();
            r.stock_line_id = Some(stock_line1.id.clone());
            r.location_id = Some(location.id.clone());
        });

        let stock_line2 = inline_init(|r: &mut StockLineRow| {
            r.id = uuid();
            r.item_id = uuid();
            r.store_id = outbound_store.id.clone();
            r.item_id = item2.id.clone();
            r.batch = Some(uuid());
            r.pack_size = 10;
            r.total_number_of_packs = 200;
            r.available_number_of_packs = 200;
            r.expiry_date = Some(NaiveDate::from_ymd(2023, 1, 5));
        });

        let outbound_shipment_line2 = inline_init(|r: &mut InvoiceLineRow| {
            r.id = uuid();
            r.invoice_id = outbound_shipment.id.clone();
            r.r#type = InvoiceLineRowType::StockOut;
            r.pack_size = stock_line2.pack_size;
            r.number_of_packs = 6;
            r.item_id = item2.id.clone();
            r.item_name = item2.name.clone();
            r.item_code = item2.code.clone();
            r.cost_price_per_pack = 15.0;
            r.sell_price_per_pack = 35.0;
            r.batch = stock_line2.batch.clone();
            r.expiry_date = stock_line2.expiry_date.clone();
            r.stock_line_id = Some(stock_line2.id.clone());
            // Location todo
        });

        ShipmentTransferTester {
            outbound_store: outbound_store.clone(),
            inbound_store: inbound_store.clone(),
            request_requisition,
            outbound_shipment_line1,
            outbound_shipment_line2,
            outbound_shipment,
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
        let ctx = service_provider.context().unwrap();
        RequisitionRowRepository::new(&ctx.connection)
            .upsert_one(&self.request_requisition)
            .unwrap();

        service_provider
            .requisition_service
            .update_request_requisition(
                &ctx,
                &self.inbound_store.id,
                inline_init(|r: &mut UpdateRequestRequisition| {
                    r.id = self.request_requisition.id.clone();
                    r.status = Some(UpdateRequestRequstionStatus::Sent);
                }),
            )
            .unwrap();
    }

    pub(crate) async fn check_response_requisition_created(
        &mut self,
        connection: &StorageConnection,
    ) {
        let response_requisition = RequisitionRepository::new(connection)
            .query_one(
                RequisitionFilter::new()
                    .linked_requisition_id(EqualFilter::equal_to(&self.request_requisition.id)),
            )
            .unwrap();
        assert!(response_requisition.is_some());
        self.response_requisition = Some(response_requisition.unwrap().requisition_row);
    }

    pub(crate) async fn insert_outbound_shipment(&self, connection: &StorageConnection) {
        assert!(self.response_requisition.is_some());
        let response_requisition_id = self.response_requisition.clone().unwrap().id;
        insert_extra_mock_data(
            &connection,
            inline_init(|r: &mut MockData| {
                r.invoices = vec![inline_edit(&self.outbound_shipment, |mut r| {
                    r.requisition_id = Some(response_requisition_id);
                    r
                })];
                r.invoice_lines = vec![
                    self.outbound_shipment_line1.clone(),
                    self.outbound_shipment_line2.clone(),
                ]
            })
            .join(self.extra_mock_data.clone()),
        )
        .await
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
        let ctx = service_provider.context().unwrap();
        self.outbound_shipment = service_provider
            .invoice_service
            .update_outbound_shipment(
                &ctx,
                &self.outbound_store.id,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = self.outbound_shipment.id.clone();
                    r.status = Some(UpdateOutboundShipmentStatus::Picked);
                }),
            )
            .unwrap()
            .invoice_row;
    }

    pub(crate) fn check_inbound_shipment_created(&mut self, connection: &StorageConnection) {
        let inbound_shipment = InvoiceRepository::new(&connection)
            .query_one(InvoiceFilter::new_match_linked_invoice_id(
                &self.outbound_shipment.id,
            ))
            .unwrap();

        assert!(inbound_shipment.is_some());
        let inbound_shipment = inbound_shipment.unwrap().invoice_row;
        self.inbound_shipment = Some(inbound_shipment.clone());

        assert_eq!(inbound_shipment.r#type, InvoiceRowType::InboundShipment);
        assert_eq!(inbound_shipment.store_id, self.inbound_store.id);
        assert_eq!(inbound_shipment.name_id, self.outbound_store.name_id);
        assert_eq!(
            inbound_shipment.name_store_id,
            Some(self.outbound_store.id.clone())
        );
        assert_eq!(
            inbound_shipment.their_reference,
            self.outbound_shipment.their_reference
        );
        assert_eq!(
            inbound_shipment.transport_reference,
            self.outbound_shipment.transport_reference
        );
        assert_eq!(inbound_shipment.colour, None);
        assert_eq!(inbound_shipment.user_id, None);
        assert_eq!(inbound_shipment.comment, None);
        assert_eq!(inbound_shipment.on_hold, false);
        assert_eq!(inbound_shipment.allocated_datetime, None);

        assert_eq!(
            inbound_shipment.requisition_id,
            Some(self.request_requisition.id.clone())
        );

        check_shipment_status(&inbound_shipment, &self.outbound_shipment);

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
            &self.outbound_shipment_line1,
        );
        check_line(
            connection,
            &inbound_shipment.id,
            &self.outbound_shipment_line2,
        );
    }

    pub(crate) fn check_outbound_shipment_was_linked(&self, connection: &StorageConnection) {
        let outbound_shipment = InvoiceRowRepository::new(connection)
            .find_one_by_id_option(&self.outbound_shipment.id)
            .unwrap();

        assert!(outbound_shipment.is_some());

        assert_eq!(
            outbound_shipment.unwrap().linked_invoice_id,
            self.inbound_shipment.clone().map(|r| r.id)
        );
    }

    // This to be skipped on second attempt
    pub(crate) fn delete_outbound_shipment(&self, service_provider: &ServiceProvider) {
        let ctx = service_provider.context().unwrap();
        service_provider
            .invoice_service
            .delete_outbound_shipment(
                &ctx,
                &self.outbound_store.id,
                self.outbound_shipment.id.clone(),
            )
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
                .find_one_by_id_option(inbound_shipment_id)
                .unwrap(),
            None
        );
    }

    pub(crate) fn update_outbound_shipment_lines(&mut self, service_provider: &ServiceProvider) {
        let ctx = service_provider.context().unwrap();
        InvoiceLineRowRepository::new(&ctx.connection)
            .delete(&self.outbound_shipment_line1.id)
            .unwrap();

        self.outbound_shipment_line2 = service_provider
            .invoice_line_service
            .update_outbound_shipment_line(
                &ctx,
                &self.outbound_store.id,
                inline_init(|r: &mut UpdateOutboundShipmentLine| {
                    r.id = self.outbound_shipment_line2.id.clone();
                    r.number_of_packs = Some(21)
                }),
            )
            .unwrap()
            .invoice_line_row;
    }
    pub(crate) fn update_outbound_shipment_to_shipped(
        &mut self,
        service_provider: &ServiceProvider,
    ) {
        let ctx = service_provider.context().unwrap();
        self.outbound_shipment = service_provider
            .invoice_service
            .update_outbound_shipment(
                &ctx,
                &self.outbound_store.id,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = self.outbound_shipment.id.clone();
                    r.status = Some(UpdateOutboundShipmentStatus::Shipped);
                }),
            )
            .unwrap()
            .invoice_row;
    }

    pub(crate) fn check_inbound_shipment_was_updated(&mut self, connection: &StorageConnection) {
        let inbound_shipment = InvoiceRowRepository::new(&connection)
            .find_one_by_id_option(&self.inbound_shipment.clone().map(|r| r.id).unwrap())
            .unwrap();

        assert!(inbound_shipment.is_some());
        let inbound_shipment = inbound_shipment.unwrap();

        assert_eq!(
            inbound_shipment,
            inline_edit(&inbound_shipment, |mut r| {
                r.status = InvoiceRowStatus::Shipped;
                r.shipped_datetime = self.outbound_shipment.shipped_datetime;
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
            1
        );

        check_line(
            connection,
            &inbound_shipment.id,
            &self.outbound_shipment_line2,
        );

        self.inbound_shipment = Some(inbound_shipment)
    }

    pub(crate) fn update_inbound_shipment_to_delivered(
        &mut self,
        service_provider: &ServiceProvider,
    ) {
        let ctx = service_provider.context().unwrap();
        let inbound_shipment = service_provider
            .invoice_service
            .update_inbound_shipment(
                &ctx,
                &self.inbound_store.id,
                "user_id",
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
        let ctx = service_provider.context().unwrap();
        let inbound_shipment = service_provider
            .invoice_service
            .update_inbound_shipment(
                &ctx,
                &self.inbound_store.id,
                "user_id",
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
            .find_one_by_id_option(&self.outbound_shipment.id)
            .unwrap();

        assert!(outbound_shipment.is_some());
        check_shipment_status(
            &outbound_shipment.unwrap(),
            &self.inbound_shipment.clone().unwrap(),
        )
    }
}

fn check_shipment_status(shipment1: &InvoiceRow, shipment2: &InvoiceRow) {
    assert_eq!(shipment1.status, shipment2.status);
    assert_eq!(shipment1.picked_datetime, shipment2.picked_datetime);
    assert_eq!(shipment1.shipped_datetime, shipment2.shipped_datetime);
    assert_eq!(shipment1.verified_datetime, shipment2.verified_datetime);
    assert_eq!(shipment1.delivered_datetime, shipment2.delivered_datetime);
}

/// Line uniqueness is checked in caller method where invoice line count is checked
fn check_line(
    connection: &StorageConnection,
    inbound_shipment_id: &str,
    outbound_line: &InvoiceLineRow,
) {
    let inbound_line = InvoiceLineRepository::new(connection)
        .query_one(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(inbound_shipment_id))
                .item_id(EqualFilter::equal_to(&outbound_line.item_id)),
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
    assert_eq!(inbound_line.r#type, InvoiceLineRowType::StockIn);
    assert_eq!(
        inbound_line.cost_price_per_pack,
        outbound_line.sell_price_per_pack
    );
    assert_eq!(
        inbound_line.total_before_tax,
        outbound_line.sell_price_per_pack * outbound_line.number_of_packs as f64
    );
    assert_eq!(
        inbound_line.total_after_tax,
        outbound_line.sell_price_per_pack * outbound_line.number_of_packs as f64
    );
    assert_eq!(inbound_line.stock_line_id, None);
    assert_eq!(inbound_line.location_id, None);
    assert_eq!(inbound_line.sell_price_per_pack, 0.0);
    assert_eq!(inbound_line.tax, Some(0.0));
}
