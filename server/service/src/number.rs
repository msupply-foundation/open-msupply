use repository::{
    InvoiceRowRepository, InvoiceRowType, NumberRowRepository, NumberRowType, RepositoryError,
    RequisitionRowRepository, RequisitionRowType, StocktakeRowRepository, StorageConnection,
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
                .find_max_invoice_number(InvoiceRowType::InboundShipment, store_id)?,
            NumberRowType::OutboundShipment => InvoiceRowRepository::new(connection_tx)
                .find_max_invoice_number(InvoiceRowType::OutboundShipment, store_id)?,
            NumberRowType::InventoryAddition => InvoiceRowRepository::new(connection_tx)
                .find_max_invoice_number(InvoiceRowType::InventoryAddition, store_id)?,
            NumberRowType::Repack => InvoiceRowRepository::new(connection_tx)
                .find_max_invoice_number(InvoiceRowType::Repack, store_id)?,
            NumberRowType::InventoryReduction => InvoiceRowRepository::new(connection_tx)
                .find_max_invoice_number(InvoiceRowType::InventoryReduction, store_id)?,
            NumberRowType::Prescription => InvoiceRowRepository::new(connection_tx)
                .find_max_invoice_number(InvoiceRowType::Prescription, store_id)?,
            NumberRowType::RequestRequisition => RequisitionRowRepository::new(connection_tx)
                .find_max_requisition_number(RequisitionRowType::Request, store_id)?,
            NumberRowType::ResponseRequisition => RequisitionRowRepository::new(connection_tx)
                .find_max_requisition_number(RequisitionRowType::Response, store_id)?,
            NumberRowType::Stocktake => {
                StocktakeRowRepository::new(connection_tx).find_max_stocktake_number(store_id)?
            }
            NumberRowType::Program(_) => {
                let next_number =
                    repo.get_next_number_for_type_and_store(r#type, store_id, None)?;
                return Ok(next_number.number);
            }
        };

        let max_next_number = max_number.map(|n| n + 1);

        repo.get_next_number_for_type_and_store(r#type, store_id, max_next_number)
            .map(|r| r.number)
    })?;
    Ok(next_number)
}

#[cfg(test)]
mod test {
    use std::{collections::HashSet, env};

    use repository::{
        mock::{
            currency_a, mock_inbound_shipment_number_store_a, mock_name_c,
            mock_outbound_shipment_number_store_a, mock_store_c, MockData, MockDataInserts,
        },
        test_db::{self, setup_all, setup_all_with_data},
        InvoiceRow, InvoiceRowType, NumberRowType, RepositoryError, TransactionError,
    };
    use util::inline_init;

    #[cfg(not(feature = "memory"))]
    const TEST_SLEEP_TIME: u64 = 100;
    const MAX_CONCURRENCY: u64 = 10;

    use crate::number::next_number;

    #[actix_rt::test]
    async fn test_number_service() {
        fn invoice1() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice1".to_string();
                r.name_link_id = mock_name_c().id;
                r.store_id = mock_store_c().id;
                r.r#type = InvoiceRowType::OutboundShipment;
                r.invoice_number = 100;
                r.currency_id = currency_a().id;
            })
        }

        let (_, connection, _, _) = setup_all_with_data(
            "test_number_service",
            MockDataInserts::none()
                .stores()
                .names()
                .numbers()
                .currencies(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice1()];
            }),
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

    #[actix_rt::test]
    #[cfg(not(feature = "memory"))]
    async fn test_concurrent_next_number() {
        let (_, _, connection_manager, _) = test_db::setup_all(
            "test_concurrent_numbers",
            MockDataInserts::none().names().stores(),
        )
        .await;

        // Note: this test is disabled when running tests using in 'memory' sqlite.
        // When running in memory sqlite uses a shared cache and returns an SQLITE_LOCKED response when two threads try to write using the shared cache concurrently
        // https://sqlite.org/rescode.html#locked
        // We are relying on busy_timeout handler to manage the SQLITE_BUSY response code in this test and there's no equivelant available for shared cache connections (SQLITE_LOCKED).
        // If we were to use shared cache in production, we'd probably need to use a mutex (or similar) to protect the database connection.

        /*
            Test Scenario

            Process A starts a transaction, and gets the next number, then waits before commiting the transaction
            Concurrently Process B tries to get the next number
            (Note: This test did fail with previous implementation of next number on postgres)
        */

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
            // --features=memory 0.13s
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
}
