use chrono::Utc;
use repository::{
    mock::{mock_item_a, mock_patient, MockData, MockDataInserts},
    EqualFilter, InvoiceFilter, InvoiceRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus,
    InvoiceType, KeyType, KeyValueStoreRow, NameRow, PrescriptionOrderRow,
    PrescriptionOrderRowRepository, PrescriptionOrderStatus, StoreRow,
};
use util::uuid::uuid;

use crate::{
    invoice::prescription::{update_prescription, UpdatePrescription, UpdatePrescriptionStatus},
    prescription_order::insert::InsertPrescriptionOrder,
    prescription_order::update::{UpdatePrescriptionOrder, UpdatePrescriptionOrderStatus},
    prescription_order_line::upsert::UpsertPrescriptionOrderLine,
    processors::ProcessorType,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

/// When a dispensing invoice generated from a prescription order reaches
/// Verified, the processor flips the order to Dispensed (idempotently), and
/// leaves orders whose dispensation is not yet verified untouched.
#[tokio::test]
async fn sets_prescription_order_to_dispensed_when_dispensation_verified() {
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
        "sets_prescription_order_to_dispensed_when_dispensation_verified",
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

    let order_repo = PrescriptionOrderRowRepository::new(&ctx.connection);
    let invoice_repo = InvoiceRowRepository::new(&ctx.connection);

    let base_order = PrescriptionOrderRow {
        store_id: store.id.clone(),
        patient_id: patient_name.id.clone(),
        status: PrescriptionOrderStatus::ReadyToDispense,
        created_by: "user_account_a".to_string(),
        created_datetime: Utc::now().naive_utc(),
        prescription_datetime: Utc::now().naive_utc(),
        ..Default::default()
    };
    let verified_order = PrescriptionOrderRow {
        id: uuid(),
        ..base_order.clone()
    };
    // Control: this order's dispensation is only Picked, so it must stay Ready
    let picked_order = PrescriptionOrderRow {
        id: uuid(),
        ..base_order.clone()
    };
    order_repo.upsert_one(&verified_order).unwrap();
    order_repo.upsert_one(&picked_order).unwrap();

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
        prescription_order_id: Some(verified_order.id.clone()),
        ..base_invoice.clone()
    };
    let picked_dispensation = InvoiceRow {
        id: uuid(),
        status: InvoiceStatus::Picked,
        prescription_order_id: Some(picked_order.id.clone()),
        ..base_invoice.clone()
    };
    invoice_repo.upsert_one(&verified_dispensation).unwrap();
    invoice_repo.upsert_one(&picked_dispensation).unwrap();

    // manually trigger because inserting the invoice doesn't trigger the processor
    ctx.processors_trigger
        .general_processor
        .try_send(ProcessorType::PrescriptionOrderStatus)
        .unwrap();
    ctx.processors_trigger.await_events_processed().await;

    let updated = order_repo
        .find_one_by_id(&verified_order.id)
        .unwrap()
        .unwrap();
    assert_eq!(updated.status, PrescriptionOrderStatus::Dispensed);
    assert_eq!(
        updated.dispensed_datetime,
        verified_dispensation.verified_datetime
    );

    let untouched = order_repo
        .find_one_by_id(&picked_order.id)
        .unwrap()
        .unwrap();
    assert_eq!(untouched.status, PrescriptionOrderStatus::ReadyToDispense);

    // Re-run: idempotent, the dispensed order is unchanged
    ctx.processors_trigger
        .general_processor
        .try_send(ProcessorType::PrescriptionOrderStatus)
        .unwrap();
    ctx.processors_trigger.await_events_processed().await;

    let re_queried = order_repo
        .find_one_by_id(&verified_order.id)
        .unwrap()
        .unwrap();
    assert_eq!(re_queried, updated);
}

/// The same-store flow end-to-end through the real services: create an order,
/// add a line, set Ready to dispense (generates the dispensation), then verify
/// the dispensation through the dispensing update service — whose own trigger
/// (not the post-sync one) must flip the order to Dispensed immediately.
#[tokio::test]
async fn verify_via_dispensing_service_flips_order_immediately() {
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
        "verify_via_dispensing_service_flips_order_immediately",
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

    let order = service_provider
        .prescription_order_service
        .insert_prescription_order(
            &ctx,
            "store_a",
            InsertPrescriptionOrder {
                id: uuid(),
                patient_id: mock_patient().id,
                ..Default::default()
            },
        )
        .unwrap();
    service_provider
        .prescription_order_line_service
        .upsert_prescription_order_line(
            &ctx,
            "store_a",
            UpsertPrescriptionOrderLine {
                id: uuid(),
                prescription_order_id: order.id.clone(),
                item_id: mock_item_a().id,
                quantity: 10.0,
                note: None,
            },
        )
        .unwrap();
    service_provider
        .prescription_order_service
        .update_prescription_order(
            &ctx,
            "store_a",
            UpdatePrescriptionOrder {
                id: order.id.clone(),
                status: Some(UpdatePrescriptionOrderStatus::ReadyToDispense),
                ..Default::default()
            },
        )
        .unwrap();

    let dispensation = InvoiceRepository::new(&ctx.connection)
        .query_one(
            InvoiceFilter::new().prescription_order_id(EqualFilter::equal_to(order.id.to_string())),
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

    let flipped = PrescriptionOrderRowRepository::new(&ctx.connection)
        .find_one_by_id(&order.id)
        .unwrap()
        .unwrap();
    assert_eq!(flipped.status, PrescriptionOrderStatus::Dispensed);
    assert!(flipped.dispensed_datetime.is_some());
}
