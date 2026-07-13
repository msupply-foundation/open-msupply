use repository::{
    mock::{MockData, MockDataInserts},
    InvoiceRow, InvoiceRowRepository, InvoiceType, KeyType, KeyValueStoreRow, NameRow, StoreRow,
};
use util::uuid::uuid;

use crate::{
    processors::ProcessorType,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

/// Prescriptions synced from legacy mSupply can arrive with an invoice_number of -1.
/// Ensure the processor allocates a real number to them, is idempotent, and leaves
/// non-prescription invoices untouched.
#[tokio::test]
async fn assigns_prescription_number_to_prescriptions() {
    let site_id = 26;

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
        "assigns_prescription_number_to_prescriptions",
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

    let prescription = InvoiceRow {
        id: uuid(),
        invoice_number: -1,
        name_id: patient_name.id.clone(),
        store_id: store.id.clone(),
        r#type: InvoiceType::Prescription,
        ..Default::default()
    };

    // Control: a non-prescription invoice with -1 should be left untouched
    let inbound_shipment = InvoiceRow {
        id: uuid(),
        invoice_number: -1,
        name_id: patient_name.id.clone(),
        store_id: store.id.clone(),
        r#type: InvoiceType::InboundShipment,
        ..Default::default()
    };

    InvoiceRowRepository::new(&ctx.connection)
        .upsert_one(&prescription)
        .unwrap();
    InvoiceRowRepository::new(&ctx.connection)
        .upsert_one(&inbound_shipment)
        .unwrap();

    // manually trigger because inserting the invoice doesn't trigger the processor
    ctx.processors_trigger
        .general_processor
        .try_send(ProcessorType::AssignPrescriptionNumber)
        .unwrap();
    ctx.processors_trigger.await_events_processed().await;

    let repo = InvoiceRowRepository::new(&ctx.connection);

    let updated_prescription = repo.find_one_by_id(&prescription.id).unwrap().unwrap();
    assert_ne!(updated_prescription.invoice_number, -1);

    // Non-prescription invoice should still be -1
    let updated_inbound = repo.find_one_by_id(&inbound_shipment.id).unwrap().unwrap();
    assert_eq!(updated_inbound.invoice_number, -1);

    // Trigger processors again to ensure it doesn't assign a new prescription number
    ctx.processors_trigger
        .general_processor
        .try_send(ProcessorType::AssignPrescriptionNumber)
        .unwrap();
    ctx.processors_trigger.await_events_processed().await;

    let re_queried_prescription = repo.find_one_by_id(&prescription.id).unwrap().unwrap();
    assert_eq!(
        re_queried_prescription.invoice_number,
        updated_prescription.invoice_number
    );
}
