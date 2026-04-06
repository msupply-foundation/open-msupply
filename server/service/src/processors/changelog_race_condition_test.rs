/// Test for issue #11087 / PR #3904: changelog race condition with real processors.
///
/// The race condition (only on Postgres with Read Committed isolation):
/// 1) Process A inserts a requisition (changelog cursor 1), commits
/// 2) Process B inserts a requisition (changelog cursor 2), but holds the transaction open
/// 3) Process C inserts a requisition (changelog cursor 3), commits
/// 4) Processor reads changelogs: sees [1, 3] (cursor 2 not visible — uncommitted)
/// 5) Processor advances cursor past 3
/// 6) Process B finally commits — cursor 2 is now visible but the processor has moved past it
/// 7) Cursor 2's requisition is never processed
///
/// The current fix uses ACCESS EXCLUSIVE lock on the changelog table so that
/// changelogs() blocks until all pending writers commit. This test verifies that
/// the real AssignRequisitionNumber processor correctly processes all 3 requisitions
/// despite the concurrent insert timing.
///
/// To verify the test catches the bug: temporarily remove the LOCK TABLE statement
/// in with_locked_changelog_table() and this test should fail on Postgres.
///
/// This test is Postgres-only because SQLite uses Serializable isolation and
/// cannot have concurrent writers (the slow transaction would block all other writes).
use repository::{
    mock::{MockData, MockDataInserts},
    KeyType, KeyValueStoreRow, NameRow, RepositoryError, RequisitionRow,
    RequisitionRowRepository, RequisitionType, StoreRow, TransactionError, Upsert,
};
use util::uuid::uuid;

use crate::{
    processors::ProcessorType,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

#[cfg(feature = "postgres")]
#[tokio::test(flavor = "multi_thread", worker_threads = 3)]
async fn test_changelog_race_condition_with_processor() {
    let site_id = 25;

    let request_name = NameRow {
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
        service_provider,
        connection_manager,
        ..
    } = setup_all_with_data_and_service_provider(
        "test_changelog_race_condition_with_processor",
        MockDataInserts::none().stores().names(),
        MockData {
            names: vec![request_name.clone(), store_name.clone()],
            stores: vec![store.clone()],
            key_value_store_rows: vec![site_id_settings],
            ..Default::default()
        },
    )
    .await;

    let ctx = service_provider.basic_context().unwrap();

    // Three response requisitions with requisition_number = -1
    // The processor should assign a number to each one
    let requisition_a = RequisitionRow {
        id: uuid(),
        requisition_number: -1,
        name_id: request_name.id.clone(),
        store_id: store.id.clone(),
        r#type: RequisitionType::Response,
        ..Default::default()
    };

    let requisition_b = RequisitionRow {
        id: uuid(),
        requisition_number: -1,
        name_id: request_name.id.clone(),
        store_id: store.id.clone(),
        r#type: RequisitionType::Response,
        ..Default::default()
    };

    let requisition_c = RequisitionRow {
        id: uuid(),
        requisition_number: -1,
        name_id: request_name.id.clone(),
        store_id: store.id.clone(),
        r#type: RequisitionType::Response,
        ..Default::default()
    };

    // Step 1: Insert requisition A — commits immediately
    requisition_a.upsert(&ctx.connection).unwrap();

    // Step 2: Start a slow transaction that inserts requisition B but delays commit.
    // This simulates a long-running sync or bulk operation that holds a transaction open.
    let (inserted_sender, inserted_receiver) = tokio::sync::oneshot::channel::<()>();
    let (proceed_sender, proceed_receiver) = std::sync::mpsc::channel::<()>();
    let manager_clone = connection_manager.clone();
    let req_b = requisition_b.clone();
    let slow_tx = tokio::spawn(async move {
        let con = manager_clone.connection().unwrap();
        let result: Result<(), TransactionError<RepositoryError>> = con.transaction_sync(|con| {
            req_b.upsert(con).unwrap();
            // Signal: requisition B is inserted (changelog cursor reserved) but tx not committed
            inserted_sender.send(()).unwrap();
            // Block until told to proceed — simulating a slow transaction
            proceed_receiver.recv().unwrap();
            Ok(())
        });
        result
    });

    // Wait for requisition B to be inserted (but NOT committed)
    inserted_receiver.await.unwrap();

    // Step 3: Insert requisition C — commits immediately.
    // On Postgres this works because Read Committed allows concurrent writes.
    // Requisition C gets a higher changelog cursor than B.
    requisition_c.upsert(&ctx.connection).unwrap();

    // Step 4: Trigger the processor.
    // With the lock: changelogs() will block until the slow tx commits, then see [A, B, C].
    // Without the lock: changelogs() would see [A, C], process them, advance cursor past C.
    ctx.processors_trigger
        .general_processor
        .try_send(ProcessorType::AssignRequisitionNumber)
        .unwrap();

    // Step 5: Give the processor a moment to start reading changelogs (and hit the lock),
    // then release the slow transaction.
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    proceed_sender.send(()).unwrap();
    slow_tx.await.unwrap().unwrap();

    // Step 6: Wait for all processor events to complete
    ctx.processors_trigger.await_events_processed().await;

    // Step 7: Verify ALL three requisitions got a number assigned.
    // If the race condition occurred, requisition B would still have requisition_number = -1.
    let repo = RequisitionRowRepository::new(&ctx.connection);

    let updated_a = repo.find_one_by_id(&requisition_a.id).unwrap().unwrap();
    let updated_b = repo.find_one_by_id(&requisition_b.id).unwrap().unwrap();
    let updated_c = repo.find_one_by_id(&requisition_c.id).unwrap().unwrap();

    assert_ne!(
        updated_a.requisition_number, -1,
        "Requisition A should have been assigned a number"
    );
    assert_ne!(
        updated_b.requisition_number, -1,
        "Requisition B should have been assigned a number — \
         if this fails, the changelog race condition was triggered \
         (B's changelog cursor was skipped because its transaction committed late)"
    );
    assert_ne!(
        updated_c.requisition_number, -1,
        "Requisition C should have been assigned a number"
    );
}
