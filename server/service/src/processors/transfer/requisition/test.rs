use std::time::Duration;

use chrono::NaiveDate;
use repository::{
    mock::{insert_extra_mock_data, MockData, MockDataInserts},
    ApprovalStatusType, EqualFilter, ItemRow, KeyType, KeyValueStoreRow, NameRow,
    RequisitionFilter, RequisitionLineFilter, RequisitionLineRepository, RequisitionLineRow,
    RequisitionLineRowRepository, RequisitionRepository, RequisitionRow, RequisitionRowRepository,
    RequisitionStatus, RequisitionType, StorageConnection, StoreRow,
};
use util::{inline_edit, inline_init, uuid::uuid};

use crate::{
    processors::test_helpers::exec_concurrent,
    requisition::{
        request_requisition::{UpdateRequestRequisition, UpdateRequestRequisitionStatus},
        response_requisition::{UpdateResponseRequisition, UpdateResponseRequisitionStatus},
    },
    service_provider::ServiceProvider,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

/// This test is for requesting and responding store on the same site
/// See same site transfer diagram in README.md for example of how
/// changelog is upserted and processed by the same instance of triggered processor
#[tokio::test(flavor = "multi_thread", worker_threads = 3)]
async fn requisition_transfer() {
    let site_id = 25;
    let request_store_name = inline_init(|r: &mut NameRow| {
        r.id = uuid();
        r.name = uuid();
    });

    let request_store = inline_init(|r: &mut StoreRow| {
        r.id = uuid();
        r.name_link_id.clone_from(&request_store_name.id);
        r.site_id = site_id;
    });

    let response_store_name = inline_init(|r: &mut NameRow| {
        r.id = uuid();
        r.name = uuid();
    });

    let response_store = inline_init(|r: &mut StoreRow| {
        r.id = uuid();
        r.name_link_id.clone_from(&response_store_name.id);
        r.site_id = site_id;
    });

    let item1 = inline_init(|r: &mut ItemRow| {
        r.id = uuid();
    });

    let item2 = inline_init(|r: &mut ItemRow| {
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

    let test_input = (
        service_provider,
        request_store,
        response_store,
        item1,
        item2,
    );

    let number_of_instances = 6;

    let test_handle = exec_concurrent(
        test_input,
        number_of_instances,
        |thread_num, test_input| async move {
            let (service_provider, request_store, response_store, item1, item2) = test_input;

            let ctx = service_provider.basic_context().unwrap();
            let mut tester = RequisitionTransferTester::new(
                &request_store,
                &response_store,
                &item1,
                &item2,
                thread_num,
            );

            log::debug!("{}: insert", thread_num);
            tester.insert_request_requisition(&ctx.connection);
            // manually trigger because inserting the requisition doesn't trigger the processor
            ctx.processors_trigger
                .requisition_transfer
                .try_send(())
                .unwrap();
            log::debug!("{}: await_events_processed", thread_num);
            ctx.processors_trigger.await_events_processed().await;
            log::debug!("{}: check_response_requisition_not_created", thread_num);
            tester.check_response_requisition_not_created(&ctx.connection);
            log::debug!("{}: update_request_requisition_to_sent", thread_num);
            tester.update_request_requisition_to_sent(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            log::debug!("{}: check_response_requisition_created", thread_num);
            tester.check_response_requisition_created(&ctx.connection, thread_num);
            ctx.processors_trigger.await_events_processed().await;
            log::debug!("{}: check_request_requisition_was_linked", thread_num);
            tester.check_request_requisition_was_linked(&ctx.connection);
            log::debug!("{}: update_response_requisition_to_approved", thread_num);
            tester.update_response_requisition_to_approved(&service_provider, thread_num);
            // Response requisition approval is usually done by mSupply
            // Processor would be triggered after sync
            // We've approved manually for testing, so need to manually trigger the processor as well
            ctx.processors_trigger
                .requisition_transfer
                .try_send(())
                .unwrap();
            log::debug!("{}: await_events_processed", thread_num);
            ctx.processors_trigger.await_events_processed().await;
            log::debug!("{}: check_request_requisition_approved", thread_num);
            tester.check_request_requisition_approved(&ctx.connection, thread_num);
            log::debug!("{}: update_response_requisition_to_finalised", thread_num);
            tester.update_response_requisition_to_finalised(&service_provider);
            ctx.processors_trigger.await_events_processed().await;
            log::debug!("{}: check_request_requisition_status_updated", thread_num);
            tester.check_request_requisition_status_updated(&ctx.connection);
        },
    );

    tokio::select! {
         Err(err) = processors_task => unreachable!("{}", err),
        _ = test_handle => (),
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

/// Deleted requisitions stuck forever
#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn stock_on_deleted_requisitions() {
    let site_id = 25;
    let store_name = inline_init(|r: &mut NameRow| {
        r.id = uuid();
        r.name = uuid();
    });

    let store = inline_init(|r: &mut StoreRow| {
        r.id = uuid();
        r.name_link_id.clone_from(&store_name.id);
        r.site_id = site_id;
    });

    let requisition = RequisitionRow {
        id: uuid(),
        requisition_number: 3,
        name_link_id: store.name_link_id.clone(),
        store_id: store.id.clone(),
        r#type: RequisitionType::Request,
        ..RequisitionRow::default()
    };

    let site_id_settings = inline_init(|r: &mut KeyValueStoreRow| {
        r.id = KeyType::SettingsSyncSiteId;
        r.value_int = Some(site_id);
    });

    let ServiceTestContext {
        service_provider,
        processors_task,
        connection,
        ..
    } = setup_all_with_data_and_service_provider(
        "stock_on_deleted_requisitions",
        MockDataInserts::none().stores().names().items().units(),
        inline_init(|r: &mut MockData| {
            r.names = vec![store_name.clone()];
            r.stores = vec![store.clone()];
            r.requisitions = vec![requisition.clone()];
            r.key_value_store_rows = vec![site_id_settings];
        }),
    )
    .await;

    RequisitionRowRepository::new(&connection)
        .delete(&requisition.id)
        .unwrap();

    // 1 second delay, to allow processor_task to finish
    let sleep_task = tokio::time::sleep(Duration::from_secs(1));
    let service_provider_closure = service_provider.clone();
    let trigger_and_wait = tokio::spawn(async move {
        let ctx = service_provider_closure.basic_context().unwrap();

        ctx.processors_trigger
            .requisition_transfer
            .try_send(())
            .unwrap();

        ctx.processors_trigger.await_events_processed().await;
    });

    tokio::select! {
         Err(err) = processors_task => unreachable!("{}", err),
         _ = sleep_task => assert!(false, "Sleep task finished before processor. Processor is stuck on delete record"),
         Ok(_) = trigger_and_wait => assert!(true),
    };
}

impl RequisitionTransferTester {
    pub(crate) fn new(
        request_store: &StoreRow,
        response_store: &StoreRow,
        item1: &ItemRow,
        item2: &ItemRow,
        thread_number: u32,
    ) -> RequisitionTransferTester {
        let request_requisition = inline_init(|r: &mut RequisitionRow| {
            r.id = format!("{}_request_requisition_{}", thread_number, uuid());
            r.requisition_number = 3;
            r.name_link_id.clone_from(&response_store.name_link_id);
            r.store_id.clone_from(&request_store.id);
            r.r#type = RequisitionType::Request;
            r.status = RequisitionStatus::Draft;
            r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap();
            r.sent_datetime = None;
            r.their_reference = Some("some reference".to_string());
            r.comment = Some("some comment".to_string());
            r.max_months_of_stock = 10.0;
            r.min_months_of_stock = 5.0;
        });

        let request_requisition_line1 = inline_init(|r: &mut RequisitionLineRow| {
            r.id = format!("{}_request_requisition_line_1_{}", thread_number, uuid());
            r.requisition_id.clone_from(&request_requisition.id);
            r.item_link_id.clone_from(&item1.id);
            r.requested_quantity = 2.0;
            r.suggested_quantity = 3.0;
            r.comment = Some("line comment".to_string());
            r.available_stock_on_hand = 1.0;
            r.average_monthly_consumption = 10.0;
            r.snapshot_datetime = Some(
                NaiveDate::from_ymd_opt(2021, 1, 1)
                    .unwrap()
                    .and_hms_opt(1, 0, 0)
                    .unwrap(),
            );
        });

        let request_requisition_line2 = inline_init(|r: &mut RequisitionLineRow| {
            r.id = format!("{}_request_requisition_line_2_{}", thread_number, uuid());
            r.requisition_id.clone_from(&request_requisition.id);
            r.item_link_id.clone_from(&item2.id);
            r.requested_quantity = 10.0;
            r.suggested_quantity = 20.0;
            r.available_stock_on_hand = 30.0;
            r.average_monthly_consumption = 10.0;
            r.snapshot_datetime = Some(
                NaiveDate::from_ymd_opt(2021, 1, 1)
                    .unwrap()
                    .and_hms_opt(2, 0, 0)
                    .unwrap(),
            );
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

    pub(crate) fn insert_request_requisition(&self, connection: &StorageConnection) {
        insert_extra_mock_data(
            connection,
            inline_init(|r: &mut MockData| {
                r.requisitions = vec![self.request_requisition.clone()];
                r.requisition_lines = vec![
                    self.request_requisition_line1.clone(),
                    self.request_requisition_line2.clone(),
                ]
            }),
        )
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
        let ctx = service_provider
            .context(self.request_store.id.clone(), "".to_string())
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

    pub(crate) fn check_response_requisition_created(
        &mut self,
        connection: &StorageConnection,
        thread_number: u32,
    ) {
        let response_requisition = RequisitionRepository::new(connection)
            .query_one(RequisitionFilter::by_linked_requisition_id(
                &self.request_requisition.id,
            ))
            .unwrap();

        assert!(response_requisition.is_some());
        let response_requisition = response_requisition.unwrap().requisition_row;
        self.response_requisition = Some(response_requisition.clone());
        assert_eq!(response_requisition.r#type, RequisitionType::Response);
        assert_eq!(response_requisition.status, RequisitionStatus::New);
        assert_eq!(response_requisition.store_id, self.response_store.id);
        assert_eq!(
            response_requisition.name_link_id,
            self.request_store.name_link_id
        );
        assert_eq!(
            response_requisition.their_reference,
            Some("From internal order 3 (some reference)".to_string())
        );
        assert_eq!(
            response_requisition.comment,
            Some("From internal order 3 (some comment)".to_string())
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
            thread_number,
        );
        check_line(
            connection,
            &response_requisition.id,
            &self.request_requisition_line2,
            thread_number,
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

    pub(crate) fn update_response_requisition_to_approved(
        &mut self,
        service_provider: &ServiceProvider,
        thread_number: u32,
    ) {
        let ctx = service_provider
            .context(self.response_store.id.clone(), "".to_string())
            .unwrap();

        let requisition_repo = RequisitionRowRepository::new(&ctx.connection);

        let response_req = self.response_requisition.clone().unwrap();

        let response_lines = RequisitionLineRepository::new(&ctx.connection)
            .query_by_filter(
                RequisitionLineFilter::new()
                    .requisition_id(EqualFilter::equal_to(&response_req.id)),
            )
            .unwrap();

        let line_count = response_lines.len();
        let mut i = 1;
        for line in response_lines {
            let mut line = line.requisition_line_row;
            log::debug!(
                "{}: Updating line {} to approved (42.0) {}/{}",
                thread_number,
                line.id,
                i,
                line_count
            );
            line.approved_quantity = 42.0;
            RequisitionLineRowRepository::new(&ctx.connection)
                .upsert_one(&line)
                .unwrap();
            i += 1;
        }

        let approved_response_requisition = RequisitionRow {
            approval_status: Some(ApprovalStatusType::Approved),
            ..response_req
        };

        requisition_repo
            .upsert_one(&approved_response_requisition)
            .unwrap();

        self.response_requisition = Some(approved_response_requisition);
    }

    pub(crate) fn check_request_requisition_approved(
        &mut self,
        connection: &StorageConnection,
        thread_number: u32,
    ) {
        let request_requisition = RequisitionRowRepository::new(connection)
            .find_one_by_id(&self.request_requisition.id)
            .unwrap();

        assert!(request_requisition.is_some());
        let request_requisition = request_requisition.unwrap();

        assert_eq!(
            request_requisition,
            inline_edit(&request_requisition, |mut r| {
                r.approval_status = Some(ApprovalStatusType::Approved);
                r
            })
        );

        let request_requisition_line1 = RequisitionLineRowRepository::new(connection)
            .find_one_by_id(&self.request_requisition_line1.id)
            .unwrap();
        assert!(request_requisition_line1.is_some());
        self.request_requisition_line1 = request_requisition_line1.unwrap();

        let request_requisition_line2 = RequisitionLineRowRepository::new(connection)
            .find_one_by_id(&self.request_requisition_line2.id)
            .unwrap();
        assert!(request_requisition_line2.is_some());
        self.request_requisition_line2 = request_requisition_line2.unwrap();

        let response_requisition = self.response_requisition.as_ref().unwrap();
        check_line(
            connection,
            &response_requisition.id,
            &self.request_requisition_line1,
            thread_number,
        );
        check_line(
            connection,
            &response_requisition.id,
            &self.request_requisition_line2,
            thread_number,
        );
    }

    pub(crate) fn update_response_requisition_to_finalised(
        &mut self,
        service_provider: &ServiceProvider,
    ) {
        let ctx = service_provider
            .context(self.response_store.id.clone(), "".to_string())
            .unwrap();

        let response_requisition = service_provider
            .requisition_service
            .update_response_requisition(
                &ctx,
                inline_init(|r: &mut UpdateResponseRequisition| {
                    r.id = self.response_requisition.clone().map(|r| r.id).unwrap();
                    r.status = Some(UpdateResponseRequisitionStatus::Finalised);
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
                r.status = RequisitionStatus::Finalised;
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
    thread_number: u32,
) {
    log::debug!("{}: Checking line {}", thread_number, request_line.id);
    let response_line = RequisitionLineRepository::new(connection)
        .query_one(
            RequisitionLineFilter::new()
                .requisition_id(EqualFilter::equal_to(response_requisition_id))
                .item_id(EqualFilter::equal_to(&request_line.item_link_id)),
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
        response_line.approved_quantity,
        request_line.approved_quantity
    );
    assert_eq!(
        response_line.available_stock_on_hand,
        request_line.available_stock_on_hand
    );
    assert_eq!(response_line.comment, request_line.comment);
    assert_eq!(
        response_line.average_monthly_consumption,
        request_line.average_monthly_consumption
    );
    assert_eq!(
        response_line.snapshot_datetime,
        request_line.snapshot_datetime
    );
    assert_eq!(response_line.supply_quantity, 0.0);

    log::debug!(
        "{}: Finished checking line {}",
        thread_number,
        request_line.id
    );
}
