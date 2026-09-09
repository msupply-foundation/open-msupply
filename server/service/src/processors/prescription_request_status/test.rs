use chrono::Utc;
use repository::{
    mock::{mock_item_a, mock_patient, MockData, MockDataInserts},
    EqualFilter, InvoiceFilter, InvoiceRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus,
    InvoiceType, KeyType, KeyValueStoreRow, NameRow, PrescriptionRequestRow,
    PrescriptionRequestRowRepository, PrescriptionRequestStatus, StoreRow,
};
use util::uuid::uuid;

use crate::{
    invoice::prescription::{update_prescription, UpdatePrescription, UpdatePrescriptionStatus},
    prescription_request::insert::InsertPrescriptionRequest,
    prescription_request::update::{UpdatePrescriptionRequest, UpdatePrescriptionRequestStatus},
    prescription_request_line::upsert::UpsertPrescriptionRequestLine,
    processors::ProcessorType,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

/// When a dispensing invoice generated from a prescription request reaches
/// Verified, the processor flips the request to Dispensed (idempotently), and
/// leaves requests whose dispensation is not yet verified untouched.
#[tokio::test]
async fn sets_prescription_request_to_dispensed_when_dispensation_verified() {
    let site_id = 27;

    let patient_name = NameRow {
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
        "sets_prescription_request_to_dispensed_when_dispensation_verified",
        MockDataInserts::none().stores().names(),
        MockData {
            names: vec![patient_name.clone(), store_name.clone()],
            stores: vec![store.clone()],
            key_value_store_rows: vec![site_id_settings],
            ..Default::default()
        },
    )
    .await;

    let ctx = service_provider.basic_context().unwrap();

    let request_repo = PrescriptionRequestRowRepository::new(&ctx.connection);
    let invoice_repo = InvoiceRowRepository::new(&ctx.connection);

    let base_request = PrescriptionRequestRow {
        store_id: store.id.clone(),
        patient_id: patient_name.id.clone(),
        status: PrescriptionRequestStatus::ReadyToDispense,
        created_by: "user_account_a".to_string(),
        created_datetime: Utc::now().naive_utc(),
        prescription_datetime: Utc::now().naive_utc(),
        ..Default::default()
    };
    let verified_request = PrescriptionRequestRow {
        id: uuid(),
        ..base_request.clone()
    };
    // Control: this request's dispensation is only Picked, so it must stay Ready
    let picked_request = PrescriptionRequestRow {
        id: uuid(),
        ..base_request.clone()
    };
    request_repo.upsert_one(&verified_request).unwrap();
    request_repo.upsert_one(&picked_request).unwrap();

    let base_invoice = InvoiceRow {
        name_id: patient_name.id.clone(),
        store_id: store.id.clone(),
        r#type: InvoiceType::Prescription,
        ..Default::default()
    };
    let verified_dispensation = InvoiceRow {
        id: uuid(),
        status: InvoiceStatus::Verified,
        verified_datetime: Some(Utc::now().naive_utc()),
        prescription_request_id: Some(verified_request.id.clone()),
        ..base_invoice.clone()
    };
    let picked_dispensation = InvoiceRow {
        id: uuid(),
        status: InvoiceStatus::Picked,
        prescription_request_id: Some(picked_request.id.clone()),
        ..base_invoice.clone()
    };
    invoice_repo.upsert_one(&verified_dispensation).unwrap();
    invoice_repo.upsert_one(&picked_dispensation).unwrap();

    // manually trigger because inserting the invoice doesn't trigger the processor
    ctx.processors_trigger
        .general_processor
        .try_send(ProcessorType::PrescriptionRequestStatus)
        .unwrap();
    ctx.processors_trigger.await_events_processed().await;

    let updated = request_repo
        .find_one_by_id(&verified_request.id)
        .unwrap()
        .unwrap();
    assert_eq!(updated.status, PrescriptionRequestStatus::Dispensed);
    assert_eq!(
        updated.dispensed_datetime,
        verified_dispensation.verified_datetime
    );

    let untouched = request_repo
        .find_one_by_id(&picked_request.id)
        .unwrap()
        .unwrap();
    assert_eq!(untouched.status, PrescriptionRequestStatus::ReadyToDispense);

    // Re-run: idempotent, the dispensed request is unchanged
    ctx.processors_trigger
        .general_processor
        .try_send(ProcessorType::PrescriptionRequestStatus)
        .unwrap();
    ctx.processors_trigger.await_events_processed().await;

    let re_queried = request_repo
        .find_one_by_id(&verified_request.id)
        .unwrap()
        .unwrap();
    assert_eq!(re_queried, updated);
}

/// The same-store flow end-to-end through the real services: create an request,
/// add a line, set Ready to dispense (generates the dispensation), then verify
/// the dispensation through the dispensing update service — whose own trigger
/// (not the post-sync one) must flip the request to Dispensed immediately.
#[tokio::test]
async fn verify_via_dispensing_service_flips_request_immediately() {
    // store_a's site (mock_store_a) must be this site for the processor's
    // active-stores filter to include its invoices.
    let site_id_settings = KeyValueStoreRow {
        id: KeyType::SettingsSyncSiteId,
        value_int: Some(100),
        ..Default::default()
    };

    let ServiceTestContext {
        service_provider, ..
    } = setup_all_with_data_and_service_provider(
        "verify_via_dispensing_service_flips_request_immediately",
        MockDataInserts::all(),
        MockData {
            key_value_store_rows: vec![site_id_settings],
            ..Default::default()
        },
    )
    .await;

    let ctx = service_provider
        .context("store_a".to_string(), "user_account_a".to_string())
        .unwrap();

    let request = service_provider
        .prescription_request_service
        .insert_prescription_request(
            &ctx,
            "store_a",
            InsertPrescriptionRequest {
                id: uuid(),
                patient_id: mock_patient().id,
                ..Default::default()
            },
        )
        .unwrap()
        .prescription_request_row;
    service_provider
        .prescription_request_line_service
        .upsert_prescription_request_line(
            &ctx,
            "store_a",
            UpsertPrescriptionRequestLine {
                id: uuid(),
                prescription_request_id: request.id.clone(),
                item_id: mock_item_a().id,
                number_of_units: 10.0,
                note: None,
            },
        )
        .unwrap();
    service_provider
        .prescription_request_service
        .update_prescription_request(
            &ctx,
            "store_a",
            UpdatePrescriptionRequest {
                id: request.id.clone(),
                status: Some(UpdatePrescriptionRequestStatus::ReadyToDispense),
                ..Default::default()
            },
        )
        .unwrap();

    let dispensation = InvoiceRepository::new(&ctx.connection)
        .query_one(
            InvoiceFilter::new()
                .prescription_request_id(EqualFilter::equal_to(request.id.to_string())),
        )
        .unwrap()
        .expect("generated dispensation not found");

    // Verify through the dispensing service — the trigger under test.
    update_prescription(
        &ctx,
        UpdatePrescription {
            id: dispensation.invoice_row.id.clone(),
            status: Some(UpdatePrescriptionStatus::Verified),
            ..Default::default()
        },
    )
    .unwrap();
    ctx.processors_trigger.await_events_processed().await;

    let flipped = PrescriptionRequestRowRepository::new(&ctx.connection)
        .find_one_by_id(&request.id)
        .unwrap()
        .unwrap();
    assert_eq!(flipped.status, PrescriptionRequestStatus::Dispensed);
    assert!(flipped.dispensed_datetime.is_some());
}
