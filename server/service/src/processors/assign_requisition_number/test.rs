use repository::{
    mock::{MockData, MockDataInserts},
    KeyType, KeyValueStoreRow, NameRow, RequisitionRow, RequisitionRowRepository, RequisitionType,
    StoreRow, SystemLogRowRepository, SystemLogType,
};
use util::uuid::uuid;

use crate::{
    processors::ProcessorType,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

/// Ensure requisition number is always assigned to response requisition
/// Even if it doesn't have a linked request requisition
#[tokio::test]
async fn assigns_requisition_number_to_response_requisitions() {
    let site_id = 25;

    let request_name = NameRow {
        id: uuid(),
        ..Default::default()
    };

    let response_store_name = NameRow {
        id: uuid(),
        ..Default::default()
    };

    let response_store = StoreRow {
        id: uuid(),
        name_id: response_store_name.id.clone(),
        site_id,
        ..Default::default()
    };

    let site_id_settings = KeyValueStoreRow {
        id: KeyType::SettingsSyncSiteId,
        value_int: Some(site_id),
        ..Default::default()
    };

    let ServiceTestContext {
        service_provider, ..
    } = setup_all_with_data_and_service_provider(
        "assigns_requisition_number_to_response_requisitions",
        MockDataInserts::none().stores().names(),
        MockData {
            names: vec![request_name.clone(), response_store_name.clone()],
            stores: vec![response_store.clone()],
            key_value_store_rows: vec![site_id_settings],
            ..Default::default()
        },
    )
    .await;

    let ctx = service_provider.basic_context().unwrap();

    let response = RequisitionRow {
        id: uuid(),
        requisition_number: -1,
        name_id: request_name.id,
        store_id: response_store.id,
        r#type: RequisitionType::Response,
        ..Default::default()
    };

    log::debug!("insert");
    RequisitionRowRepository::new(&ctx.connection)
        .upsert_one(&response)
        .unwrap();

    // manually trigger because inserting the requisition doesn't trigger the processor
    ctx.processors_trigger
        .general_processor
        .try_send(ProcessorType::AssignRequisitionNumber)
        .unwrap();
    log::debug!(" await_events_processed");
    ctx.processors_trigger.await_events_processed().await;

    let updated_response = RequisitionRowRepository::new(&ctx.connection)
        .find_one_by_id(&response.id)
        .unwrap()
        .unwrap();

    assert_ne!(updated_response.requisition_number, -1);

    // Trigger processors again to ensure it doesn't assign a new requisition number
    ctx.processors_trigger
        .general_processor
        .try_send(ProcessorType::AssignRequisitionNumber)
        .unwrap();
    log::debug!("await_events_processed");
    ctx.processors_trigger.await_events_processed().await;

    let re_queried_response = RequisitionRowRepository::new(&ctx.connection)
        .find_one_by_id(&response.id)
        .unwrap()
        .unwrap();

    assert_eq!(
        re_queried_response.requisition_number,
        updated_response.requisition_number
    );
}

/// The processor sees every requisition changelog row for the store, including the rows
/// of requisitions deleted before it ran. Nothing is left to number, so none is an error.
#[tokio::test]
async fn deleted_requisition_is_not_an_error() {
    let site_id = 25;

    let customer_name = NameRow {
        id: uuid(),
        ..Default::default()
    };
    let store_name = NameRow {
        id: uuid(),
        ..Default::default()
    };
    let store = StoreRow {
        id: uuid(),
        name_id: store_name.id.clone(),
        site_id,
        ..Default::default()
    };
    let site_id_settings = KeyValueStoreRow {
        id: KeyType::SettingsSyncSiteId,
        value_int: Some(site_id),
        ..Default::default()
    };

    let ServiceTestContext {
        service_provider, ..
    } = setup_all_with_data_and_service_provider(
        "assign_requisition_number_deleted_requisition",
        MockDataInserts::none().stores().names(),
        MockData {
            names: vec![customer_name.clone(), store_name],
            stores: vec![store.clone()],
            key_value_store_rows: vec![site_id_settings],
            ..Default::default()
        },
    )
    .await;

    let ctx = service_provider.basic_context().unwrap();

    let draft = RequisitionRow {
        id: uuid(),
        requisition_number: -1,
        name_id: customer_name.id,
        store_id: store.id,
        r#type: RequisitionType::Response,
        ..Default::default()
    };
    let repo = RequisitionRowRepository::new(&ctx.connection);
    repo.upsert_one(&draft).unwrap();
    repo.delete(&draft.id).unwrap();

    ctx.processors_trigger
        .general_processor
        .try_send(ProcessorType::AssignRequisitionNumber)
        .unwrap();
    ctx.processors_trigger.await_events_processed().await;

    let processor_errors: Vec<_> = SystemLogRowRepository::new(&ctx.connection)
        .find_all()
        .unwrap()
        .into_iter()
        .filter(|log| log.r#type == SystemLogType::ProcessorError)
        .collect();
    assert!(
        processor_errors.is_empty(),
        "Expected no processor errors for a deleted requisition, got {:?}",
        processor_errors
    );
}
