use repository::{
    InvoiceRowRepository, InvoiceRowType, NumberRowRepository, NumberRowType, RepositoryError,
    RequisitionRowRepository, RequisitionRowType, StocktakeRowRepository, StorageConnection,
};

pub fn next_number(
    connection: &StorageConnection,
    r#type: &NumberRowType,
    store_id: &str,
) -> Result<i64, RepositoryError> {
    // Should be done in transaction
    let next_number = connection.transaction_sync(|connection_tx| {
        let repo = NumberRowRepository::new(&connection_tx);
        let number = repo.find_one_by_type_and_store(r#type, store_id)?;

        if number.is_some() {
            let next_number = repo.get_next_number_for_type_and_store(r#type, store_id, None)?;
            Ok(next_number.number)
        } else {
            match r#type {
                NumberRowType::InboundShipment => {
                    let find_number = InvoiceRowRepository::new(&connection_tx)
                        .find_max_invoice_number(InvoiceRowType::InboundShipment, store_id)?
                        .map(|n| n + 1);
                    let next_number =
                        repo.get_next_number_for_type_and_store(r#type, store_id, find_number)?;

                    return Ok(next_number.number);
                }
                NumberRowType::OutboundShipment => {
                    let find_number = InvoiceRowRepository::new(&connection_tx)
                        .find_max_invoice_number(InvoiceRowType::OutboundShipment, store_id)?
                        .map(|n| n + 1);
                    let next_number =
                        repo.get_next_number_for_type_and_store(r#type, store_id, find_number)?;

                    return Ok(next_number.number);
                }
                NumberRowType::InventoryAdjustment => {
                    let find_number = InvoiceRowRepository::new(&connection_tx)
                        .find_max_invoice_number(InvoiceRowType::InventoryAdjustment, store_id)?
                        .map(|n| n + 1);
                    let next_number =
                        repo.get_next_number_for_type_and_store(r#type, store_id, find_number)?;

                    return Ok(next_number.number);
                }
                NumberRowType::RequestRequisition => {
                    let find_number = RequisitionRowRepository::new(&connection_tx)
                        .find_max_requisition_number(RequisitionRowType::Request, store_id)?
                        .map(|n| n + 1);
                    let next_number =
                        repo.get_next_number_for_type_and_store(r#type, store_id, find_number)?;

                    return Ok(next_number.number);
                }
                NumberRowType::ResponseRequisition => {
                    let find_number = RequisitionRowRepository::new(&connection_tx)
                        .find_max_requisition_number(RequisitionRowType::Response, store_id)?
                        .map(|n| n + 1);
                    let next_number =
                        repo.get_next_number_for_type_and_store(r#type, store_id, find_number)?;

                    return Ok(next_number.number);
                }
                NumberRowType::Stocktake => {
                    let find_number = StocktakeRowRepository::new(&connection_tx)
                        .find_max_stocktake_number(store_id)?
                        .map(|n| n + 1);
                    let next_number =
                        repo.get_next_number_for_type_and_store(r#type, store_id, find_number)?;

                    return Ok(next_number.number);
                }
                NumberRowType::Program(_) => {
                    let next_number =
                        repo.get_next_number_for_type_and_store(r#type, store_id, None)?;
                    return Ok(next_number.number);
                }
            };
        }
    })?;
    Ok(next_number)
}

#[cfg(test)]
mod test {
    use std::{collections::HashSet, env};

    use repository::{
        mock::{
            mock_inbound_shipment_number_store_a, mock_outbound_shipment_number_store_a,
            MockDataInserts,
        },
        test_db::{self, setup_all},
        NumberRowType, RepositoryError, TransactionError,
    };

    const TEST_SLEEP_TIME: u64 = 100;
    const MAX_CONCURRENCY: u64 = 10;

    use crate::number::next_number;

    #[actix_rt::test]
    async fn test_number_service() {
        let (_, connection, _, _) = setup_all("test_number_service", MockDataInserts::all()).await;

        let inbound_shipment_store_a_number = mock_inbound_shipment_number_store_a();
        let outbound_shipment_store_b_number = mock_outbound_shipment_number_store_a();

        // Test existing

        let result = next_number(&connection, &NumberRowType::InboundShipment, "store_a").unwrap();
        assert_eq!(result, inbound_shipment_store_a_number.value + 1);

        let result = next_number(&connection, &NumberRowType::InboundShipment, "store_a").unwrap();
        assert_eq!(result, inbound_shipment_store_a_number.value + 2);

        let result = next_number(&connection, &NumberRowType::OutboundShipment, "store_a").unwrap();
        assert_eq!(result, outbound_shipment_store_b_number.value + 1);

        // Test new

        let result = next_number(&connection, &NumberRowType::OutboundShipment, "store_b").unwrap();
        assert_eq!(result, 1);

        let result = next_number(&connection, &NumberRowType::OutboundShipment, "store_b").unwrap();
        assert_eq!(result, 2);
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
