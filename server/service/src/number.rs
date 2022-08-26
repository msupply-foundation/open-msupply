use repository::{
    NumberRow, NumberRowRepository, NumberRowType, RepositoryError, StorageConnection,
};
use util::uuid::uuid;

pub fn next_number(
    connection: &StorageConnection,
    r#type: &NumberRowType,
    store_id: &str,
) -> Result<i64, RepositoryError> {
    // Should be done in transaction
    let next_number = connection.transaction_sync(|connection_tx| {
        let repo = NumberRowRepository::new(&connection_tx);
        let current = repo.find_one_by_type_and_store(r#type, store_id)?;
        //This should compile as a no-op in production code, only used during tests
        let updated_number_row = match current {
            Some(mut row) => {
                // update existing counter
                row.value = row.value + 1;
                repo.upsert_one(&row)?;
                row
            }
            None => {
                // insert new counter
                let row = NumberRow {
                    id: uuid(),
                    value: 1,
                    r#type: r#type.clone(),
                    store_id: store_id.to_owned(),
                };
                repo.upsert_one(&row)?;
                row
            }
        };
        Ok(updated_number_row.value)
    })?;
    Ok(next_number)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_inbound_shipment_number_store_a, mock_outbound_shipment_number_store_a,
            MockDataInserts,
        },
        test_db::{self, setup_all},
        NumberRowType, RepositoryError, TransactionError,
    };

    const TEST_SLEEP_TIME: u64 = 100;

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
    async fn test_concurrent_next_number() {
        let (_, _, connection_manager, _) = test_db::setup_all(
            "test_concurrent_numbers",
            MockDataInserts::none().names().stores(),
        )
        .await;
        /*
            Test Scenario

            Process A starts a transaction, and gets the next number, then waits before commiting the transaction
            Concurrently Process B tries to get the next number
            (Note: This test did fail with previous implementation of next number on postgres)
        */

        //Part 1: Concurrent up date (first row) e.g. this will require an insert and an update for these processes...

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

        //Part 2: Concurrent up date both doing updates
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
}
