use repository::{
    goods_received_row::GoodsReceivedRowRepository, GoodsReceivedLineRowRepository,
    InvoiceRowRepository, InvoiceType, NumberRowRepository, NumberRowType,
    PurchaseOrderLineRowRepository, PurchaseOrderRowRepository, RepositoryError,
    RequisitionRowRepository, RequisitionType, StocktakeRowRepository, StorageConnection,
};

/// Get next number for record type and store
/// If number for record type and store exists in number table, increment it and return next number
/// Otherwise find max number for record type and store, increment by one, add to number table and return it
pub fn next_number(
    connection: &StorageConnection,
    r#type: &NumberRowType,
    store_id: &str,
) -> Result<i64, RepositoryError> {
    // Should be done in transaction
    let next_number = connection.transaction_sync(|connection_tx| {
        let repo = NumberRowRepository::new(connection_tx);
        let number_exists = repo.find_one_by_type_and_store(r#type, store_id)?.is_some();

        if number_exists {
            let next_number = repo.get_next_number_for_type_and_store(r#type, store_id, None)?;
            return Ok(next_number.number);
        };

        let max_number = match r#type {
            NumberRowType::InboundShipment => InvoiceRowRepository::new(connection_tx)
                .find_max_invoice_number(InvoiceType::InboundShipment, store_id)?,
            NumberRowType::OutboundShipment => InvoiceRowRepository::new(connection_tx)
                .find_max_invoice_number(InvoiceType::OutboundShipment, store_id)?,
            NumberRowType::InventoryAddition => InvoiceRowRepository::new(connection_tx)
                .find_max_invoice_number(InvoiceType::InventoryAddition, store_id)?,
            NumberRowType::Repack => InvoiceRowRepository::new(connection_tx)
                .find_max_invoice_number(InvoiceType::Repack, store_id)?,
            NumberRowType::InventoryReduction => InvoiceRowRepository::new(connection_tx)
                .find_max_invoice_number(InvoiceType::InventoryReduction, store_id)?,
            NumberRowType::Prescription => InvoiceRowRepository::new(connection_tx)
                .find_max_invoice_number(InvoiceType::Prescription, store_id)?,
            NumberRowType::RequestRequisition => RequisitionRowRepository::new(connection_tx)
                .find_max_requisition_number(RequisitionType::Request, store_id)?,
            NumberRowType::ResponseRequisition => RequisitionRowRepository::new(connection_tx)
                .find_max_requisition_number(RequisitionType::Response, store_id)?,
            NumberRowType::Stocktake => {
                StocktakeRowRepository::new(connection_tx).find_max_stocktake_number(store_id)?
            }
            NumberRowType::CustomerReturn => InvoiceRowRepository::new(connection_tx)
                .find_max_invoice_number(InvoiceType::CustomerReturn, store_id)?,
            NumberRowType::SupplierReturn => InvoiceRowRepository::new(connection_tx)
                .find_max_invoice_number(InvoiceType::SupplierReturn, store_id)?,
            NumberRowType::PurchaseOrder => PurchaseOrderRowRepository::new(connection_tx)
                .find_max_purchase_order_number(store_id)?,
            NumberRowType::GoodsReceived => GoodsReceivedRowRepository::new(connection_tx)
                .find_max_goods_received_number(store_id)?,
            NumberRowType::PurchaseOrderLine(purchase_order_id) => {
                PurchaseOrderLineRowRepository::new(connection_tx)
                    .find_max_purchase_order_line_number(purchase_order_id)?
            }
            NumberRowType::GoodsReceivedLine(goods_received_id) => {
                GoodsReceivedLineRowRepository::new(connection_tx)
                    .find_max_goods_received_line_number(goods_received_id)?
            }
            NumberRowType::Program(_) => {
                let next_number =
                    repo.get_next_number_for_type_and_store(r#type, store_id, None)?;
                return Ok(next_number.number);
            }
        }
        // Invoices and requisitions synced from Legacy are given number `-1` until serial number assigned by OMS
        // That means max_number is -1 the first time this runs, which would assign 0 as the next number (invalid)
        // Lowest "max_number" should be 0
        .map(|n| n.max(0));

        let max_next_number = max_number.map(|n| n + 1);

        repo.get_next_number_for_type_and_store(r#type, store_id, max_next_number)
            .map(|r| r.number)
    })?;
    Ok(next_number)
}

#[cfg(test)]
mod test {
    use std::{collections::HashSet, env, time::Instant};

    use repository::{
        mock::{
            mock_inbound_shipment_number_store_a, mock_name_a, mock_name_c,
            mock_outbound_shipment_number_store_a, mock_store_c, MockData, MockDataInserts,
        },
        test_db::{self, setup_all, setup_all_with_data},
        InvoiceRow, InvoiceType, NumberRowType, RepositoryError, RequisitionRow, RequisitionType,
        TransactionError,
    };

    const TEST_SLEEP_TIME: u64 = 100;
    const MAX_CONCURRENCY: u64 = 10;

    use crate::number::next_number;

    #[actix_rt::test]
    async fn test_number_service() {
        fn invoice1() -> InvoiceRow {
            InvoiceRow {
                id: "invoice1".to_string(),
                name_link_id: mock_name_c().id,
                store_id: mock_store_c().id,
                r#type: InvoiceType::OutboundShipment,
                invoice_number: 100,
                ..Default::default()
            }
        }
        fn unassigned_requisition() -> RequisitionRow {
            RequisitionRow {
                id: "unassigned_requisition".to_string(),
                name_link_id: mock_name_a().id,
                store_id: mock_store_c().id,
                r#type: RequisitionType::Response,
                requisition_number: -1,
                ..Default::default()
            }
        }

        let (_, connection, _, _) = setup_all_with_data(
            "test_number_service",
            MockDataInserts::none()
                .stores()
                .names()
                .numbers()
                .currencies(),
            MockData {
                invoices: vec![invoice1()],
                requisitions: vec![unassigned_requisition()],
                ..Default::default()
            },
        )
        .await;

        let inbound_shipment_store_a_number = mock_inbound_shipment_number_store_a();
        let outbound_shipment_store_b_number = mock_outbound_shipment_number_store_a();

        // Test existing
        let result = next_number(&connection, &NumberRowType::InboundShipment, "store_a").unwrap();
        assert_eq!(result, inbound_shipment_store_a_number.value + 1);

        let result = next_number(&connection, &NumberRowType::InboundShipment, "store_a").unwrap();
        assert_eq!(result, inbound_shipment_store_a_number.value + 2);

        let result = next_number(&connection, &NumberRowType::OutboundShipment, "store_a").unwrap();
        assert_eq!(result, outbound_shipment_store_b_number.value + 1);

        // Test new with store that has no invoices
        let result = next_number(&connection, &NumberRowType::OutboundShipment, "store_b").unwrap();
        assert_eq!(result, 1);

        let result = next_number(&connection, &NumberRowType::OutboundShipment, "store_b").unwrap();
        assert_eq!(result, 2);

        // Test new with store that has existing invoice
        let result = next_number(&connection, &NumberRowType::OutboundShipment, "store_c").unwrap();
        assert_eq!(result, 101);

        // Check serial 1 (not 0) assigned after records with -1
        let result =
            next_number(&connection, &NumberRowType::ResponseRequisition, "store_c").unwrap();
        assert_eq!(result, 1);
    }

    #[actix_rt::test]
    async fn test_number_service_for_programs() {
        let (_, connection, _, _) = setup_all(
            "test_number_service_for_programs",
            MockDataInserts::none().names().stores(),
        )
        .await;

        let result = next_number(
            &connection,
            &NumberRowType::Program("PROGRAM_A".to_string()),
            "store_a",
        )
        .unwrap();
        assert_eq!(result, 1);

        let result = next_number(
            &connection,
            &NumberRowType::Program("PROGRAM_A".to_string()),
            "store_b",
        )
        .unwrap();
        assert_eq!(result, 1);

        let result = next_number(
            &connection,
            &NumberRowType::Program("PROGRAM_A".to_string()),
            "store_a",
        )
        .unwrap();
        assert_eq!(result, 2);

        let result = next_number(
            &connection,
            &NumberRowType::Program("PROGRAM_B".to_string()),
            "store_a",
        )
        .unwrap();
        assert_eq!(result, 1);
    }

    /// When running in memory mode sqlite uses a shared cache and returns an SQLITE_LOCKED response
    /// when two threads try to write using the shared cache concurrently
    /// https://sqlite.org/rescode.html#locked
    /// We are relying on busy_timeout handler to manage the SQLITE_BUSY response code in this
    /// test and there's no equivalent available for shared cache connections (SQLITE_LOCKED).
    /// If we were to use shared cache in production, we'd probably need to use a mutex (or
    /// similar) to protect the database connection.
    ///
    /// Note: memory mode is not currently supported for sqlite
    #[actix_rt::test]
    async fn test_concurrent_next_number() {
        let (_, _, connection_manager, _) = test_db::setup_all(
            "test_concurrent_numbers",
            MockDataInserts::none().names().stores(),
        )
        .await;

        // Test Scenario
        //
        // Process A starts a transaction, and gets the next number, then waits before committing
        // the transaction.
        // Concurrently Process B tries to get the next number
        // (Note: This test did fail with previous implementation of next number on postgres)

        // Part 1: Both threads will try to add a new number row (first time this number type has been used)
        // This should result in 1 insert and 1 update.
        let manager_a = connection_manager.clone();
        let process_a = std::thread::spawn(move || {
            let connection = manager_a.connection().unwrap();
            let result: Result<i64, TransactionError<RepositoryError>> = connection
                .transaction_sync(|con| {
                    let num = next_number(con, &NumberRowType::Stocktake, "store_a")?;
                    std::thread::sleep(core::time::Duration::from_millis(TEST_SLEEP_TIME));
                    Ok(num)
                });
            result.unwrap()
        });

        let manager_b = connection_manager.clone();
        let process_b = std::thread::spawn(move || {
            let connection = manager_b.connection().unwrap();
            next_number(&connection, &NumberRowType::Stocktake, "store_a").unwrap()
        });

        let a = process_a.join().unwrap();
        let b = process_b.join().unwrap();
        println!("next_number (INSERT) results : a={} b={}", a, b);
        assert!(a != b);

        let manager_a = connection_manager.clone();
        let process_a = std::thread::spawn(move || {
            let connection = manager_a.connection().unwrap();
            let result: Result<i64, TransactionError<RepositoryError>> = connection
                .transaction_sync(|con| {
                    let num = next_number(con, &NumberRowType::Stocktake, "store_a")?;
                    std::thread::sleep(core::time::Duration::from_millis(TEST_SLEEP_TIME));
                    Ok(num)
                });
            result.unwrap()
        });

        // Part 2: Both threads will try to increment the value in the existing row
        // This should result in 2 updates
        let manager_b = connection_manager.clone();
        let process_b = std::thread::spawn(move || {
            let connection = manager_b.connection().unwrap();
            next_number(&connection, &NumberRowType::Stocktake, "store_a").unwrap()
        });

        let a = process_a.join().unwrap();
        let b = process_b.join().unwrap();

        println!("next_number (UPDATE) results : a={} b={}", a, b);
        assert!(a != b);
    }

    #[actix_rt::test]
    async fn test_highly_concurrent_next_number() {
        let (_, _, connection_manager, _) = test_db::setup_all(
            "test_highly_concurrent_numbers",
            MockDataInserts::none().names().stores(),
        )
        .await;

        if env::var("RUN_CONCURRENT_TESTS").is_err()
            || env::var("RUN_CONCURRENT_TESTS").unwrap() != "true"
        {
            // To run this test use something like `RUN_CONCURRENT_TESTS=true cargo test --package service --lib -- number::test::test_highly_concurrent_next_number --exact --nocapture`

            // Performance M1 Macbook Pro (postgres in docker)
            // --features=postgres 0.62s
            // --features=sqlite 0.14s

            return;
        }
        /*
        Test Scenario
            Spawn lots of processes all trying get the next number for store_a concurrently.
            This isn't intended to be run on every request, so it only runs when ENV: RUN_CONCURRENT_TESTS is set to true
        */

        //Create the first record to avoid issues with concurrent inserts (it's tested in test_concurrent_next_number if you need it)
        let connection = connection_manager.connection().unwrap();
        let _num = next_number(&connection, &NumberRowType::Stocktake, "store_a").unwrap();

        //Do lots of next_numbering
        let mut handles = vec![];
        for _ in 0..MAX_CONCURRENCY {
            let manager = connection_manager.clone();
            let handle = std::thread::spawn(move || {
                let connection = manager.connection().unwrap();
                let result: Result<i64, TransactionError<RepositoryError>> = connection
                    .transaction_sync(|connection| {
                        let num = next_number(connection, &NumberRowType::Stocktake, "store_a")?;
                        Ok(num)
                    });
                result.unwrap()
            });
            handles.push(handle);
        }

        let mut unique_numbers = HashSet::new();
        for handle in handles {
            let num = handle.join().unwrap();
            println!("num: {}", num);
            let new_value = unique_numbers.insert(num);
            assert!(new_value);
        }
    }

    /// Throughput benchmark for `next_number` under concurrent load.
    ///
    /// Spawns `BENCH_THREADS` OS threads, each of which fetches the next number
    /// `BENCH_OPS_PER_THREAD` times in a loop, and reports total wall-clock time
    /// and throughput (operations/second). It also asserts that every number
    /// handed out is unique, so it doubles as a correctness check under load.
    ///
    /// This is gated behind `RUN_CONCURRENT_TESTS=true` so it doesn't run in the
    /// normal test suite. Run against each backend to compare:
    ///
    /// sqlite:
    /// ```sh
    /// RUN_CONCURRENT_TESTS=true cargo test --package service --lib --features=sqlite \
    ///   -- number::test::bench_concurrent_next_number --exact --nocapture
    /// ```
    ///
    /// postgres (requires a running postgres, see repository test config):
    /// ```sh
    /// RUN_CONCURRENT_TESTS=true cargo test --package service --lib --features=postgres \
    ///   -- number::test::bench_concurrent_next_number --exact --nocapture
    /// ```
    ///
    /// Concurrency and load are configurable via env vars:
    ///   BENCH_THREADS         number of concurrent threads (default 10)
    ///   BENCH_OPS_PER_THREAD  next_number calls per thread (default 100)
    ///
    /// Note: the connection pool defaults to 10 connections, so threads beyond
    /// that will queue waiting for a connection (which mirrors production).
    #[actix_rt::test]
    async fn bench_concurrent_next_number() {
        if env::var("RUN_CONCURRENT_TESTS").as_deref() != Ok("true") {
            return;
        }

        let num_threads: u64 = env::var("BENCH_THREADS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(10);
        let ops_per_thread: u64 = env::var("BENCH_OPS_PER_THREAD")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(100);
        let total_ops = num_threads * ops_per_thread;

        let backend = if cfg!(feature = "postgres") {
            "postgres"
        } else {
            "sqlite"
        };

        let (_, _, connection_manager, _) = test_db::setup_all(
            "bench_concurrent_next_number",
            MockDataInserts::none().names().stores(),
        )
        .await;

        // Create the first record up front to avoid the concurrent-insert race
        // (that path is covered by test_concurrent_next_number); from here every
        // call is an update, which is what we want to benchmark.
        let connection = connection_manager.connection().unwrap();
        let _num = next_number(&connection, &NumberRowType::Stocktake, "store_a").unwrap();

        let start = Instant::now();

        let mut handles = vec![];
        for _ in 0..num_threads {
            let manager = connection_manager.clone();
            let handle = std::thread::spawn(move || {
                let connection = manager.connection().unwrap();
                let mut numbers = Vec::with_capacity(ops_per_thread as usize);
                for _ in 0..ops_per_thread {
                    let num =
                        next_number(&connection, &NumberRowType::Stocktake, "store_a").unwrap();
                    numbers.push(num);
                }
                numbers
            });
            handles.push(handle);
        }

        let mut unique_numbers = HashSet::with_capacity(total_ops as usize);
        for handle in handles {
            for num in handle.join().unwrap() {
                // Every number handed out must be unique, even under contention.
                assert!(unique_numbers.insert(num), "duplicate number: {}", num);
            }
        }

        let elapsed = start.elapsed();
        let ops_per_sec = total_ops as f64 / elapsed.as_secs_f64();

        println!(
            "\nnext_number benchmark [{}]\n  threads:        {}\n  ops/thread:     {}\n  total ops:      {}\n  elapsed:        {:.3?}\n  throughput:     {:.0} ops/sec\n  avg latency:    {:.3} ms/op\n",
            backend,
            num_threads,
            ops_per_thread,
            total_ops,
            elapsed,
            ops_per_sec,
            elapsed.as_secs_f64() * 1000.0 / total_ops as f64,
        );

        // Sanity: we got exactly the number of unique values we expected.
        assert_eq!(unique_numbers.len() as u64, total_ops);
    }
}
