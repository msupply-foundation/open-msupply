use repository::{
    mock::{mock_store_a, MockData, MockDataInserts},
    EqualFilter, KeyType, KeyValueStoreRow, NameRow, NameRowType, NameStoreJoinFilter,
    NameStoreJoinRepository, NameStoreJoinRow, StorageConnection, StoreRow, Upsert,
};
use util::uuid::uuid;

use crate::{
    processors::ProcessorType,
    sync::test_util_set_is_central_server,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

#[tokio::test]
async fn requests_link_patient_to_oms_central_store() {
    let central_site_id = 1000;

    let non_visible_patient = NameRow {
        id: uuid(),
        r#type: NameRowType::Patient,
        ..Default::default()
    };

    let central_store_name = NameRow {
        id: uuid(),
        r#type: NameRowType::Store,
        ..Default::default()
    };

    let central_store = StoreRow {
        id: uuid(),
        name_link_id: central_store_name.id.clone(),
        site_id: central_site_id,
        ..Default::default()
    };

    let site_id_settings = KeyValueStoreRow {
        id: KeyType::SettingsSyncSiteId,
        value_int: Some(central_site_id),
        ..Default::default()
    };

    let ServiceTestContext {
        service_provider, ..
    } = setup_all_with_data_and_service_provider(
        "requests_link_patient_to_oms_central_store",
        MockDataInserts::none().names().stores(),
        MockData {
            names: vec![non_visible_patient.clone(), central_store_name.clone()],
            stores: vec![central_store.clone()],
            key_value_store_rows: vec![site_id_settings],
            ..Default::default()
        },
    )
    .await;

    test_util_set_is_central_server(true);

    let ctx = service_provider.basic_context().unwrap();

    let patient_visible_on_central =
        is_patient_visible_on_central(&ctx.connection, &non_visible_patient.id, &central_store.id);

    // Ensure not visible on central before we start
    assert!(!patient_visible_on_central);

    let nsj_non_visible_patient_remote = NameStoreJoinRow {
        id: uuid(),
        name_link_id: non_visible_patient.id.clone(),
        store_id: mock_store_a().id,
        ..Default::default()
    };

    log::debug!("insert nsj_non_visible_patient_remote");

    // Insert, to emulate receiving this record via push from remote site
    nsj_non_visible_patient_remote
        .upsert(&ctx.connection)
        .unwrap();

    // manually trigger because insert doesn't trigger the processor
    ctx.processors_trigger
        .general_processor
        .try_send(ProcessorType::AddPatientVisibilityForCentral)
        .unwrap();
    log::debug!("await_events_processed");
    ctx.processors_trigger.await_events_processed().await;

    let patient_visible_on_central =
        is_patient_visible_on_central(&ctx.connection, &non_visible_patient.id, &central_store.id);

    // Patient visibility for central should have been added
    assert!(patient_visible_on_central);
}

fn is_patient_visible_on_central(
    connection: &StorageConnection,
    patient_id: &str,
    central_store_id: &str,
) -> bool {
    let repo = NameStoreJoinRepository::new(connection);
    let patient_visible_on_central = repo
        .query_by_filter(
            NameStoreJoinFilter::new()
                .name_id(EqualFilter::equal_to(patient_id))
                .store_id(EqualFilter::equal_to(central_store_id)),
        )
        .unwrap();

    // Empty = not visible on central store
    !patient_visible_on_central.is_empty()
}
