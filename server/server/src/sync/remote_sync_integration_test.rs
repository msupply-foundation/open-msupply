#[cfg(test)]
mod remote_sync_integration_tests {
    use rand::{thread_rng, Rng};
    use repository::{
        mock::MockDataInserts,
        schema::{NumberRow, NumberRowType},
        test_db::setup_all,
        NumberRowRepository, StorageConnection,
    };
    use util::{inline_edit, uuid::uuid};

    use crate::{settings::SyncSettings, sync::Synchroniser};

    /// return storage connection and a store_id
    async fn init_db(sync_settings: &SyncSettings) -> (StorageConnection, Synchroniser) {
        let (_, connection, connection_manager, _) =
            setup_all("remote_sync_integration_tests", MockDataInserts::none()).await;

        // add new data -> push -> clear locally -> pull -> modify -> push -> clear locally -> pull
        let synchroniser = Synchroniser::new(sync_settings.clone(), connection_manager).unwrap();
        synchroniser
            .central_data
            .pull_and_integrate_records(&connection)
            .await
            .unwrap();

        (connection, synchroniser)
    }

    trait SyncRecordTester<T> {
        /// inserts new row(s)
        fn insert(&self, connection: &StorageConnection, store_id: &str) -> T;
        /// mutates existing row(s) locally
        fn mutate(&self, connection: &StorageConnection, row: &T) -> T;
        /// validates that the expected row(s) are in the local DB
        fn validate(&self, connection: &StorageConnection, row: &T);
    }

    fn gen_i64() -> i64 {
        let mut rng = thread_rng();
        let number: f64 = rng.gen();
        let number = (999999.0 * number) as i64;
        number
    }

    struct NumberSyncRecordTester {}
    impl SyncRecordTester<Vec<NumberRow>> for NumberSyncRecordTester {
        fn insert(&self, connection: &StorageConnection, store_id: &str) -> Vec<NumberRow> {
            let number_repo = NumberRowRepository::new(&connection);

            let mut row_0 = number_repo
                .find_one_by_type_and_store(&NumberRowType::InboundShipment, &store_id)
                .unwrap()
                .unwrap_or(NumberRow {
                    id: uuid(),
                    value: 0,
                    store_id: store_id.to_string(),
                    r#type: NumberRowType::InboundShipment,
                });
            row_0.value = gen_i64();

            let mut row_1 = number_repo
                .find_one_by_type_and_store(&NumberRowType::OutboundShipment, &store_id)
                .unwrap()
                .unwrap_or(NumberRow {
                    id: uuid(),
                    value: 0,
                    store_id: store_id.to_string(),
                    r#type: NumberRowType::OutboundShipment,
                });
            row_1.value = gen_i64();

            let mut row_2 = number_repo
                .find_one_by_type_and_store(&NumberRowType::InventoryAdjustment, &store_id)
                .unwrap()
                .unwrap_or(NumberRow {
                    id: uuid(),
                    value: 0,
                    store_id: store_id.to_string(),
                    r#type: NumberRowType::InventoryAdjustment,
                });
            row_2.value = gen_i64();

            let mut row_3 = number_repo
                .find_one_by_type_and_store(&NumberRowType::RequestRequisition, &store_id)
                .unwrap()
                .unwrap_or(NumberRow {
                    id: uuid(),
                    value: 0,
                    store_id: store_id.to_string(),
                    r#type: NumberRowType::RequestRequisition,
                });
            row_3.value = gen_i64();

            let mut row_4 = number_repo
                .find_one_by_type_and_store(&NumberRowType::ResponseRequisition, &store_id)
                .unwrap()
                .unwrap_or(NumberRow {
                    id: uuid(),
                    value: 0,
                    store_id: store_id.to_string(),
                    r#type: NumberRowType::ResponseRequisition,
                });
            row_4.value = gen_i64();

            let mut row_5 = number_repo
                .find_one_by_type_and_store(&NumberRowType::Stocktake, &store_id)
                .unwrap()
                .unwrap_or(NumberRow {
                    id: uuid(),
                    value: 0,
                    store_id: store_id.to_string(),
                    r#type: NumberRowType::Stocktake,
                });
            row_5.value = gen_i64();

            let rows = vec![row_0, row_1, row_2, row_3, row_4, row_5];
            for row in &rows {
                number_repo.upsert_one(row).unwrap();
            }
            rows
        }

        fn mutate(&self, connection: &StorageConnection, rows: &Vec<NumberRow>) -> Vec<NumberRow> {
            let number_repo = NumberRowRepository::new(&connection);
            let rows = rows
                .iter()
                .map(|row| {
                    let row = inline_edit(row, |mut d| {
                        d.value = gen_i64();
                        d
                    });
                    number_repo.upsert_one(&row).unwrap();
                    row
                })
                .collect();
            rows
        }

        fn validate(&self, connection: &StorageConnection, rows: &Vec<NumberRow>) {
            for row_expected in rows {
                let number_repo = NumberRowRepository::new(&connection);
                let row = number_repo
                    .find_one_by_type_and_store(&row_expected.r#type, &row_expected.store_id)
                    .unwrap()
                    .expect(&format!("Number row not found: {:?} ", row_expected));
                assert_eq!(row_expected, &row);
            }
        }
    }

    async fn test_sync_record<T>(
        store_id: &str,
        sync_settings: &SyncSettings,
        tester: &dyn SyncRecordTester<T>,
    ) {
        let (connection, synchroniser) = init_db(sync_settings).await;
        synchroniser
            .remote_data
            .initial_pull(&connection)
            .await
            .unwrap();

        // push some new changes
        let data = tester.insert(&connection, store_id);
        synchroniser
            .remote_data
            .push_changes(&connection)
            .await
            .unwrap();
        // reset local DB and pull changes
        let (connection, synchroniser) = init_db(sync_settings).await;
        synchroniser
            .remote_data
            .initial_pull(&connection)
            .await
            .unwrap();
        // validate we pulled the same data we inserted
        tester.validate(&connection, &data);

        // mutate changes
        let data = tester.mutate(&connection, &data);
        synchroniser
            .remote_data
            .push_changes(&connection)
            .await
            .unwrap();
        // reset local DB and pull changes
        let (connection, synchroniser) = init_db(sync_settings).await;
        synchroniser
            .remote_data
            .initial_pull(&connection)
            .await
            .unwrap();
        // validate we pulled the same data we inserted
        tester.validate(&connection, &data);
    }

    /// This test assumes a running central server.
    /// To run the this test, enable the test macro and update the sync_settings and used store_id.
    //#[actix_rt::test]
    async fn test_syncing_new_data() {
        let sync_settings = SyncSettings {
            url: "http://192.168.178.77:8080".to_string(),
            username: "mobiletest".to_string(),
            password: "".to_string(),
            interval: 60 * 60,
            central_server_site_id: 1,
            site_id: 7,
            site_hardware_id: "49149896-E713-4535-9DA8-C30AB06F9D5E".to_string(),
        };
        let store_id = "80004C94067A4CE5A34FC343EB1B4306";

        // numbers
        let number_tester = NumberSyncRecordTester {};
        test_sync_record(store_id, &sync_settings, &number_tester).await;
    }
}
