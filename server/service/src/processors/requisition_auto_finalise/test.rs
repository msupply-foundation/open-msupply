use std::vec;

use repository::{
    mock::{MockData, MockDataInserts},
    InvoiceLineType, InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType, ItemRow,
    KeyType, KeyValueStoreRepository, KeyValueStoreRow, NameRow, PreferenceRow,
    PreferenceRowRepository, RequisitionLineRow, RequisitionLineRowRepository, RequisitionRow,
    RequisitionRowRepository, RequisitionStatus, RequisitionType, StockLineRow, StorageConnection,
    StoreRow,
};
use util::uuid::uuid;

use crate::{
    preference::PrefKey,
    processors::ProcessorType,
    service_provider::ServiceContext,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

#[tokio::test]
async fn test_requisition_auto_finalise() {
    let site_id = 25;

    let customer_name = NameRow {
        id: uuid(),
        ..Default::default()
    };

    let response_store_name = NameRow {
        id: uuid(),
        ..Default::default()
    };

    let store = StoreRow {
        id: uuid(),
        name_link_id: response_store_name.id.clone(),
        site_id,
        ..Default::default()
    };

    let site_id_settings = KeyValueStoreRow {
        id: KeyType::SettingsSyncSiteId,
        value_int: Some(site_id),
        ..Default::default()
    };

    let item_1 = ItemRow {
        id: uuid(),
        name: "item1".to_string(),
        r#type: repository::ItemType::Stock,
        is_active: true,
        ..Default::default()
    };

    let item_2 = ItemRow {
        id: uuid(),
        name: "item2".to_string(),
        r#type: repository::ItemType::Stock,
        is_active: true,
        ..Default::default()
    };

    let stock_line_1 = StockLineRow {
        id: uuid(),
        item_link_id: item_1.id.clone(),
        store_id: store.id.clone(),
        total_number_of_packs: 100.0,
        available_number_of_packs: 100.0,
        pack_size: 1.0,
        ..Default::default()
    };

    let stock_line_2 = StockLineRow {
        id: uuid(),
        item_link_id: item_2.id.clone(),
        store_id: store.id.clone(),
        total_number_of_packs: 100.0,
        available_number_of_packs: 100.0,
        pack_size: 2.0,
        ..Default::default()
    };

    let requisition = RequisitionRow {
        id: uuid(),
        requisition_number: 1,
        name_link_id: customer_name.id.clone(),
        store_id: store.id.clone(),
        r#type: RequisitionType::Response,
        status: RequisitionStatus::New,
        ..Default::default()
    };

    let preference = PreferenceRow {
        id: PrefKey::RequisitionAutoFinalise.to_string() + "_" + &store.id,
        key: PrefKey::RequisitionAutoFinalise.to_string(),
        value: "true".to_string(),
        store_id: Some(store.id.clone()),
    };

    let ServiceTestContext {
        service_context: ctx,
        connection,
        ..
    } = setup_all_with_data_and_service_provider(
        "requisition_auto_finalise_processor_test",
        MockDataInserts::none().stores().names(),
        MockData {
            names: vec![customer_name.clone(), response_store_name.clone()],
            stores: vec![store.clone()],
            key_value_store_rows: vec![site_id_settings],
            requisitions: vec![requisition.clone()],
            items: vec![item_1.clone(), item_2.clone()],
            stock_lines: vec![stock_line_1, stock_line_2],
            preferences: vec![preference.clone()],
            ..Default::default()
        },
    )
    .await;

    run_processor(&ctx).await;
    let requisition = requisition_get(&connection, &requisition.id);
    assert_eq!(
        requisition.status,
        RequisitionStatus::New,
        "Expected status to be New, there are no linked invoices"
    );

    let requisition_line_1 = RequisitionLineRow {
        id: uuid(),
        requisition_id: requisition.id.clone(),
        item_link_id: item_1.id.clone(),
        requested_quantity: 100.0,
        ..Default::default()
    };

    RequisitionLineRowRepository::new(&connection)
        .upsert_one(&requisition_line_1)
        .unwrap();

    let mut linked_invoice = InvoiceRow {
        id: uuid(),
        store_id: store.id.clone(),
        name_id: customer_name.id.clone(),
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::Allocated,
        requisition_id: Some(requisition.id.clone()),
        ..Default::default()
    };

    InvoiceRowRepository::new(&connection)
        .upsert_one(&linked_invoice)
        .unwrap();

    let mut invoice_line_1 = repository::InvoiceLineRow {
        id: uuid(),
        invoice_id: linked_invoice.id.clone(),
        item_link_id: item_1.id.clone(),
        number_of_packs: 99.0,
        pack_size: 1.0,
        r#type: InvoiceLineType::StockOut,
        ..Default::default()
    };
    repository::InvoiceLineRowRepository::new(&connection)
        .upsert_one(&invoice_line_1)
        .unwrap();

    run_processor(&ctx).await;
    let requisition = requisition_get(&connection, &requisition.id);
    assert_eq!(
        requisition.status,
        RequisitionStatus::New,
        "Expected status to be New, the invoice is still Allocated"
    );

    linked_invoice.status = InvoiceStatus::Shipped;
    InvoiceRowRepository::new(&connection)
        .upsert_one(&linked_invoice)
        .unwrap();

    run_processor(&ctx).await;
    let requisition = requisition_get(&connection, &requisition.id);
    assert_eq!(
        requisition.status,
        RequisitionStatus::New,
        "Expected status to be New, the invoice has been shipped but amount supplied is less than requisition supply quantity"
    );

    invoice_line_1.number_of_packs = 100.0;
    repository::InvoiceLineRowRepository::new(&connection)
        .upsert_one(&invoice_line_1)
        .unwrap();
    run_processor(&ctx).await;
    let mut requisition = requisition_get(&connection, &requisition.id);
    assert_eq!(
        requisition.status,
        RequisitionStatus::Finalised,
        "Expected status to be Finalised, the invoice has been shipped and amount supplied meets requisition supply quantity"
    );

    // reset requisition to New
    requisition.status = RequisitionStatus::New;
    requisition.finalised_datetime = None;
    RequisitionRowRepository::new(&connection)
        .upsert_one(&requisition)
        .unwrap();

    let mut linked_invoice_2 = InvoiceRow {
        id: uuid(),
        store_id: store.id.clone(),
        name_id: customer_name.id.clone(),
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::New,
        requisition_id: Some(requisition.id.clone()),
        ..Default::default()
    };
    InvoiceRowRepository::new(&connection)
        .upsert_one(&linked_invoice_2)
        .unwrap();
    let mut invoice_line_2 = repository::InvoiceLineRow {
        id: uuid(),
        invoice_id: linked_invoice_2.id.clone(),
        item_link_id: item_1.id.clone(),
        number_of_packs: 3.0,
        pack_size: 20.0,
        r#type: InvoiceLineType::StockOut,
        ..Default::default()
    };
    repository::InvoiceLineRowRepository::new(&connection)
        .upsert_one(&invoice_line_2)
        .unwrap();
    invoice_line_1.number_of_packs = 50.0;
    invoice_line_1.pack_size = 1.0;
    repository::InvoiceLineRowRepository::new(&connection)
        .upsert_one(&invoice_line_1)
        .unwrap();

    run_processor(&ctx).await;
    let requisition = requisition_get(&connection, &requisition.id);
    assert_eq!(
        requisition.status,
        RequisitionStatus::New,
        "Expected status to be New, not all linked invoices are shipped"
    );

    invoice_line_2.pack_size = 10.0;
    repository::InvoiceLineRowRepository::new(&connection)
        .upsert_one(&invoice_line_2)
        .unwrap();
    linked_invoice_2.status = InvoiceStatus::Shipped;
    InvoiceRowRepository::new(&connection)
        .upsert_one(&linked_invoice_2)
        .unwrap();
    run_processor(&ctx).await;
    let requisition = requisition_get(&connection, &requisition.id);
    assert_eq!(
        requisition.status,
        RequisitionStatus::New,
        "Expected status to be New, invoices are shipped but total supplied is less than requisition supply quantity"
    );

    invoice_line_2.pack_size = 20.0;
    repository::InvoiceLineRowRepository::new(&connection)
        .upsert_one(&invoice_line_2)
        .unwrap();
    run_processor(&ctx).await;
    let requisition = requisition_get(&connection, &requisition.id);
    assert_eq!(
        requisition.status,
        RequisitionStatus::Finalised,
        "Expected status to be Finalised, all linked invoices are shipped and total supplied meets requisition supply quantity"
    );

    // reset requisition to New
    let mut requisition = requisition_get(&connection, &requisition.id);
    requisition.status = RequisitionStatus::New;
    requisition.finalised_datetime = None;
    RequisitionRowRepository::new(&connection)
        .upsert_one(&requisition)
        .unwrap();

    let mut requisition_line_2 = RequisitionLineRow {
        id: uuid(),
        requisition_id: requisition.id.clone(),
        item_link_id: item_2.id.clone(),
        requested_quantity: 5.0,
        ..Default::default()
    };

    RequisitionLineRowRepository::new(&connection)
        .upsert_one(&requisition_line_2)
        .unwrap();
    run_processor(&ctx).await;
    let requisition = requisition_get(&connection, &requisition.id);
    assert_eq!(
        requisition.status,
        RequisitionStatus::New,
        "Expected status to be New, not all requisition lines have their supply quantity met"
    );

    requisition_line_2.requested_quantity = 0.0;
    RequisitionLineRowRepository::new(&connection)
        .upsert_one(&requisition_line_2)
        .unwrap();
    run_processor(&ctx).await;
    let requisition = requisition_get(&connection, &requisition.id);
    assert_eq!(
        requisition.status,
        RequisitionStatus::Finalised,
        "Expected status to be Finalised, all requisition lines have their supply quantity met"
    );

    // reset requisition to New
    let mut requisition = requisition_get(&connection, &requisition.id);
    requisition.status = RequisitionStatus::New;
    requisition.finalised_datetime = None;
    RequisitionRowRepository::new(&connection)
        .upsert_one(&requisition)
        .unwrap();

    // Disable auto finalise preference
    let preference = PreferenceRow {
        value: "false".to_string(),
        ..preference
    };
    PreferenceRowRepository::new(&connection)
        .upsert_one(&preference)
        .unwrap();
    run_processor(&ctx).await;
    let requisition = requisition_get(&connection, &requisition.id);
    assert_eq!(
        requisition.status,
        RequisitionStatus::New,
        "Expected status to be New, auto finalise preference is disabled"
    );
}

async fn run_processor(ctx: &ServiceContext) {
    // reset the keystore value for the processor to run again as we don't always update the invoice in this test
    KeyValueStoreRepository::new(&ctx.connection)
        .upsert_one(&KeyValueStoreRow {
            id: KeyType::RequisitionAutoFinaliseProcessorCursor,
            value_int: Some(0),
            ..Default::default()
        })
        .unwrap();
    ctx.processors_trigger
        .general_processor
        .try_send(ProcessorType::RequisitionAutoFinalise)
        .unwrap();
    log::debug!("await_events_processed");
    ctx.processors_trigger.await_events_processed().await;
}

fn requisition_get(conn: &StorageConnection, id: &str) -> RequisitionRow {
    RequisitionRowRepository::new(&conn)
        .find_one_by_id(id)
        .unwrap()
        .unwrap()
}
