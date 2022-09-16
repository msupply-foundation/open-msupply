use chrono::NaiveDate;
use repository::{
    mock::{insert_extra_mock_data, MockData, MockDataInserts},
    EqualFilter, ItemRow, KeyValueStoreRow, KeyValueType, NameRow, RequisitionFilter,
    RequisitionLineFilter, RequisitionLineRepository, RequisitionLineRow, RequisitionRepository,
    RequisitionRow, RequisitionRowRepository, RequisitionRowStatus, RequisitionRowType,
    StorageConnection, StoreRow,
};
use util::{inline_edit, inline_init, uuid::uuid};

use crate::{
    processors::test_helpers::delay_for_processor,
    requisition::{
        request_requisition::{UpdateRequestRequisition, UpdateRequestRequstionStatus},
        response_requisition::{UpdateResponseRequisition, UpdateResponseRequstionStatus},
    },
    service_provider::ServiceProvider,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

/// This test is for requesting and responding store on the same site
/// See same site transfer diagram in README.md
#[actix_rt::test]
async fn requisition_transfer() {
    let site_id = 25;
    let request_store_name = inline_init(|r: &mut NameRow| {
        r.id = uuid();
        r.name = uuid();
    });

    let request_store = inline_init(|r: &mut StoreRow| {
        r.id = uuid();
        r.name_id = request_store_name.id.clone();
        r.site_id = site_id;
    });

    let response_store_name = inline_init(|r: &mut NameRow| {
        r.id = uuid();
        r.name = uuid();
    });

    let response_store = inline_init(|r: &mut StoreRow| {
        r.id = uuid();
        r.name_id = response_store_name.id.clone();
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
        "requisition_transfer",
        MockDataInserts::none().stores().names().items().units(),
        inline_init(|r: &mut MockData| {
            r.names = vec![request_store_name.clone(), response_store_name.clone()];
            r.stores = vec![request_store.clone(), response_store.clone()];
            r.items = vec![item1.clone(), item2.clone()];
            r.key_value_store_rows = vec![site_id_settings];
        }),
    )
    .await;

    let test = || async move {
        let mut tester =
            RequisitionTransferTester::new(&request_store, &response_store, &item1, &item2);
        let ctx = service_provider.context().unwrap();

        tester.insert_request_requisition(&connection).await;
        // Need to do manual trigger here since inserting requisition won't trigger processor
        // and we want to validate that not sent requisition does not generate transfer
        ctx.processors_trigger.trigger_requisition_transfers();
        delay_for_processor().await;
        tester.check_response_requisition_not_created(&connection);
        delay_for_processor().await;
        tester.update_request_requisition_to_sent(&service_provider);
        delay_for_processor().await;
        tester.check_response_requisition_created(&connection);
        delay_for_processor().await;
        tester.check_request_requisition_was_linked(&connection);
        delay_for_processor().await;
        tester.update_response_requisition_to_finalised(&service_provider);
        delay_for_processor().await;
        tester.check_request_requisition_status_updated(&connection);
    };

    tokio::select! {
        Err(err) = processors_task => unreachable!("{}", err),
        _ = test() => (),
    };
}

pub(crate) struct RequisitionTransferTester {
    request_store: StoreRow,
    response_store: StoreRow,
    request_requisition: RequisitionRow,
    request_requisition_line1: RequisitionLineRow,
    request_requisition_line2: RequisitionLineRow,
    response_requisition: Option<RequisitionRow>,
}

impl RequisitionTransferTester {
    pub(crate) fn new(
        request_store: &StoreRow,
        response_store: &StoreRow,
        item1: &ItemRow,
        item2: &ItemRow,
    ) -> RequisitionTransferTester {
        let request_requisition = inline_init(|r: &mut RequisitionRow| {
            r.id = uuid();
            r.requisition_number = 3;
            r.name_id = response_store.name_id.clone();
            r.store_id = request_store.id.clone();
            r.r#type = RequisitionRowType::Request;
            r.status = RequisitionRowStatus::Draft;
            r.created_datetime = NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0);
            r.sent_datetime = None;
            r.their_reference = Some(uuid());
            r.max_months_of_stock = 10.0;
            r.min_months_of_stock = 5.0;
        });

        let request_requisition_line1 = inline_init(|r: &mut RequisitionLineRow| {
            r.id = uuid();
            r.requisition_id = request_requisition.id.clone();
            r.item_id = item1.id.clone();
            r.requested_quantity = 2;
            r.suggested_quantity = 3;
            r.available_stock_on_hand = 1;
            r.average_monthly_consumption = 1;
            r.snapshot_datetime = Some(NaiveDate::from_ymd(2021, 01, 01).and_hms(1, 0, 0));
        });

        let request_requisition_line2 = inline_init(|r: &mut RequisitionLineRow| {
            r.id = uuid();
            r.requisition_id = request_requisition.id.clone();
            r.item_id = item2.id.clone();
            r.requested_quantity = 10;
            r.suggested_quantity = 20;
            r.available_stock_on_hand = 30;
            r.average_monthly_consumption = 10;
            r.snapshot_datetime = Some(NaiveDate::from_ymd(2021, 01, 01).and_hms(2, 0, 0));
        });

        RequisitionTransferTester {
            request_store: request_store.clone(),
            response_store: response_store.clone(),
            request_requisition,
            request_requisition_line1,
            request_requisition_line2,
            response_requisition: None,
        }
    }

    // These methods to be run in sequence

    pub(crate) async fn insert_request_requisition(&self, connection: &StorageConnection) {
        insert_extra_mock_data(
            &connection,
            inline_init(|r: &mut MockData| {
                r.requisitions = vec![self.request_requisition.clone()];
                r.requisition_lines = vec![
                    self.request_requisition_line1.clone(),
                    self.request_requisition_line2.clone(),
                ]
            }),
        )
        .await
    }

    pub(crate) fn check_response_requisition_not_created(&self, connection: &StorageConnection) {
        assert_eq!(
            RequisitionRepository::new(connection).query_one(
                RequisitionFilter::by_linked_requisition_id(&self.request_requisition.id)
            ),
            Ok(None)
        )
    }

    pub(crate) fn update_request_requisition_to_sent(&self, service_provider: &ServiceProvider) {
        let ctx = service_provider.context().unwrap();
        service_provider
            .requisition_service
            .update_request_requisition(
                &ctx,
                &self.request_store.id,
                inline_init(|r: &mut UpdateRequestRequisition| {
                    r.id = self.request_requisition.id.clone();
                    r.status = Some(UpdateRequestRequstionStatus::Sent);
                }),
            )
            .unwrap();
    }

    pub(crate) fn check_response_requisition_created(&mut self, connection: &StorageConnection) {
        let response_requisition = RequisitionRepository::new(&connection)
            .query_one(RequisitionFilter::by_linked_requisition_id(
                &self.request_requisition.id,
            ))
            .unwrap();

        assert!(response_requisition.is_some());
        let response_requisition = response_requisition.unwrap().requisition_row;
        self.response_requisition = Some(response_requisition.clone());
        assert_eq!(response_requisition.r#type, RequisitionRowType::Response);
        assert_eq!(response_requisition.status, RequisitionRowStatus::New);
        assert_eq!(response_requisition.store_id, self.response_store.id);
        assert_eq!(response_requisition.name_id, self.request_store.name_id);
        assert_eq!(
            response_requisition.their_reference,
            self.request_requisition.their_reference
        );
        assert_eq!(
            response_requisition.max_months_of_stock,
            self.request_requisition.max_months_of_stock
        );
        assert_eq!(
            response_requisition.min_months_of_stock,
            self.request_requisition.min_months_of_stock
        );
        assert_eq!(
            response_requisition.expected_delivery_date,
            self.request_requisition.expected_delivery_date
        );

        assert_eq!(
            RequisitionLineRepository::new(connection)
                .count(Some(RequisitionLineFilter::new().requisition_id(
                    EqualFilter::equal_to(&response_requisition.id)
                )))
                .unwrap(),
            2
        );

        check_line(
            connection,
            &response_requisition.id,
            &self.request_requisition_line1,
        );
        check_line(
            connection,
            &response_requisition.id,
            &self.request_requisition_line2,
        );
    }

    pub(crate) fn check_request_requisition_was_linked(&self, connection: &StorageConnection) {
        let request_requisition = RequisitionRowRepository::new(connection)
            .find_one_by_id(&self.request_requisition.id)
            .unwrap();

        assert!(request_requisition.is_some());
        assert!(self.response_requisition.is_some());

        assert_eq!(
            request_requisition.unwrap().linked_requisition_id,
            self.response_requisition.clone().map(|r| r.id)
        );
    }

    pub(crate) fn update_response_requisition_to_finalised(
        &mut self,
        service_provider: &ServiceProvider,
    ) {
        let ctx = service_provider.context().unwrap();

        let response_requisition = service_provider
            .requisition_service
            .update_response_requisition(
                &ctx,
                &self.response_store.id,
                "user_id",
                inline_init(|r: &mut UpdateResponseRequisition| {
                    r.id = self.response_requisition.clone().map(|r| r.id).unwrap();
                    r.status = Some(UpdateResponseRequstionStatus::Finalised);
                }),
            )
            .unwrap();
        self.response_requisition = Some(response_requisition.requisition_row);
    }

    pub(crate) fn check_request_requisition_status_updated(&self, connection: &StorageConnection) {
        let request_requisition = RequisitionRowRepository::new(connection)
            .find_one_by_id(&self.request_requisition.id)
            .unwrap();

        assert!(request_requisition.is_some());
        let request_requisition = request_requisition.unwrap();

        assert_eq!(
            request_requisition,
            inline_edit(&request_requisition, |mut r| {
                r.status = RequisitionRowStatus::Finalised;
                r.finalised_datetime = self
                    .response_requisition
                    .clone()
                    .map(|r| r.finalised_datetime)
                    .unwrap();
                r
            })
        );
    }
}

/// Line uniqueness is checked in caller method where requisition line count is checked
fn check_line(
    connection: &StorageConnection,
    response_requisition_id: &str,
    request_line: &RequisitionLineRow,
) {
    let response_line = RequisitionLineRepository::new(connection)
        .query_one(
            RequisitionLineFilter::new()
                .requisition_id(EqualFilter::equal_to(response_requisition_id))
                .item_id(EqualFilter::equal_to(&request_line.item_id)),
        )
        .unwrap();

    assert!(response_line.is_some());
    let response_line = response_line.unwrap().requisition_line_row;

    assert_eq!(
        response_line.requested_quantity,
        request_line.requested_quantity
    );
    assert_eq!(
        response_line.suggested_quantity,
        request_line.suggested_quantity
    );
    assert_eq!(
        response_line.available_stock_on_hand,
        request_line.available_stock_on_hand
    );
    assert_eq!(
        response_line.average_monthly_consumption,
        request_line.average_monthly_consumption
    );
    assert_eq!(
        response_line.snapshot_datetime,
        request_line.snapshot_datetime
    );
    assert_eq!(response_line.supply_quantity, 0);
}
