//! A transfer step reads the request requisition when its record is built, not when it writes.
//! The steps run in turn on one record, so a later step must not write back the copy the record
//! read over what an earlier step (or the API) has written since.

use chrono::{NaiveDate, Utc};
use repository::{
    ApprovalStatusType, KeyType, KeyValueStoreRow, RequisitionFilter, RequisitionRepository,
    RequisitionRow, RequisitionRowRepository, RequisitionStatus, RequisitionType,
    StorageConnection,
    mock::{
        MockData, MockDataInserts, mock_name_store_a, mock_name_store_b, mock_store_a, mock_store_b,
    },
    test_db::setup_all_with_data,
};

use crate::service_provider::ServiceProvider;

use super::{
    RequisitionTransferOutput, RequisitionTransferProcessor, RequisitionTransferProcessorRecord,
    link_request_requisition::LinkRequestRequisitionProcessor, process_requisition_transfers,
    update_request_requisition_approved_quantities::UpdateRequestRequisitionApprovedQuantitiesProcessor,
    update_request_requisition_status::UpdateRequestRequisitionStatusProcessor,
};

fn datetime(day: u32) -> chrono::NaiveDateTime {
    NaiveDate::from_ymd_opt(2026, 11, day)
        .unwrap()
        .and_hms_opt(9, 0, 0)
        .unwrap()
}

fn request_row(id: &str) -> RequisitionRow {
    RequisitionRow {
        id: id.to_string(),
        requisition_number: 1,
        name_id: mock_name_store_b().id,
        store_id: mock_store_a().id,
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Sent,
        created_datetime: Utc::now().naive_utc(),
        sent_datetime: Some(datetime(1)),
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        ..Default::default()
    }
}

fn response_row(id: &str, request_id: &str) -> RequisitionRow {
    RequisitionRow {
        id: id.to_string(),
        requisition_number: 2,
        name_id: mock_name_store_a().id,
        store_id: mock_store_b().id,
        r#type: RequisitionType::Response,
        status: RequisitionStatus::Finalised,
        created_datetime: Utc::now().naive_utc(),
        finalised_datetime: Some(datetime(4)),
        approval_status: Some(ApprovalStatusType::Approved),
        linked_requisition_id: Some(request_id.to_string()),
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        ..Default::default()
    }
}

fn read_record(
    connection: &StorageConnection,
    requisition_id: &str,
    linked_id: &str,
) -> RequisitionTransferProcessorRecord {
    let repo = RequisitionRepository::new(connection);
    let requisition = repo
        .query_one(RequisitionFilter::by_id(requisition_id))
        .unwrap()
        .unwrap();
    let linked_requisition = repo.query_one(RequisitionFilter::by_id(linked_id)).unwrap();
    let other_party_store_id = requisition.name_row.id.clone();
    RequisitionTransferProcessorRecord {
        requisition,
        linked_requisition,
        other_party_store_id,
    }
}

fn requisition_row(connection: &StorageConnection, id: &str) -> RequisitionRow {
    RequisitionRowRepository::new(connection)
        .find_one_by_id(id)
        .unwrap()
        .unwrap()
}

/// A response requisition that reaches the request's site already approved and finalised gets
/// linked, approved and finalised on one record. Each step must keep what the steps before it wrote
#[actix_rt::test]
async fn link_approve_finalise_on_one_record_keeps_all_three() {
    let request = request_row("stale_request");
    let response = response_row("stale_response", &request.id);
    let (_, connection, _, _) = setup_all_with_data(
        "link_approve_finalise_on_one_record_keeps_all_three",
        MockDataInserts::none().names().stores(),
        MockData {
            requisitions: vec![request.clone(), response.clone()],
            ..Default::default()
        },
    )
    .await;

    let record = read_record(&connection, &response.id, &request.id);

    for (step, processor) in [
        (
            "link",
            &LinkRequestRequisitionProcessor as &dyn RequisitionTransferProcessor,
        ),
        (
            "approve",
            &UpdateRequestRequisitionApprovedQuantitiesProcessor,
        ),
        ("finalise", &UpdateRequestRequisitionStatusProcessor),
    ] {
        let result = processor.try_process_record(&connection, &record).unwrap();
        assert!(
            matches!(result, RequisitionTransferOutput::Processed(_)),
            "expected the {step} step to run, got {result:?}"
        );
    }

    let request_after = requisition_row(&connection, &request.id);
    assert_eq!(
        request_after.linked_requisition_id,
        Some(response.id.clone()),
        "approving and finalising must not undo the link"
    );
    assert_eq!(
        request_after.approval_status,
        Some(ApprovalStatusType::Approved),
        "finalising must not undo the approval"
    );
    assert_eq!(request_after.status, RequisitionStatus::Finalised);
    assert_eq!(request_after.finalised_datetime, Some(datetime(4)));
}

/// "Already linked" is checked against the request as it is now, not as the record read it. A
/// request linked since to another response keeps that link
#[actix_rt::test]
async fn link_skips_request_linked_after_record_read() {
    let request = request_row("guard_request");
    let response = response_row("guard_response", &request.id);
    let other_response = RequisitionRow {
        requisition_number: 3,
        ..response_row("guard_other_response", &request.id)
    };
    let (_, connection, _, _) = setup_all_with_data(
        "link_skips_request_linked_after_record_read",
        MockDataInserts::none().names().stores(),
        MockData {
            requisitions: vec![request.clone(), response.clone(), other_response.clone()],
            ..Default::default()
        },
    )
    .await;

    let record = read_record(&connection, &response.id, &request.id);

    RequisitionRowRepository::new(&connection)
        .upsert_one(&RequisitionRow {
            linked_requisition_id: Some(other_response.id.clone()),
            ..request.clone()
        })
        .unwrap();

    let result = LinkRequestRequisitionProcessor
        .try_process_record(&connection, &record)
        .unwrap();
    assert!(
        matches!(
            result,
            RequisitionTransferOutput::LinkedRequisitionNotLinked
        ),
        "expected the link step to skip, got {result:?}"
    );
    assert_eq!(
        requisition_row(&connection, &request.id).linked_requisition_id,
        Some(other_response.id.clone()),
        "the link written after the record was read must be kept"
    );
}

/// The same as `link_approve_finalise_on_one_record_keeps_all_three`, but through the processor
/// itself: the response's changelog row is picked up and every step runs in the order the
/// processor runs them, so a change to that order is tested too
#[actix_rt::test]
async fn processor_run_links_approves_and_finalises_request_from_one_record() {
    let request = request_row("processor_run_request");
    let response = response_row("processor_run_response", &request.id);
    let (_, connection, connection_manager, _) = setup_all_with_data(
        "processor_run_links_approves_and_finalises_request_from_one_record",
        MockDataInserts::none().names().stores(),
        MockData {
            requisitions: vec![request.clone(), response.clone()],
            // This site holds the request's store, so it processes the response's changes
            key_value_store_rows: vec![KeyValueStoreRow {
                id: KeyType::SettingsSyncSiteId,
                value_int: Some(mock_store_a().site_id),
                ..Default::default()
            }],
            ..Default::default()
        },
    )
    .await;

    process_requisition_transfers(&ServiceProvider::new(connection_manager)).unwrap();

    let request_after = requisition_row(&connection, &request.id);
    assert_eq!(
        request_after.linked_requisition_id,
        Some(response.id.clone()),
        "approving and finalising must not undo the link"
    );
    assert_eq!(
        request_after.approval_status,
        Some(ApprovalStatusType::Approved),
        "finalising must not undo the approval"
    );
    assert_eq!(request_after.status, RequisitionStatus::Finalised);
    assert_eq!(request_after.finalised_datetime, Some(datetime(4)));
}
