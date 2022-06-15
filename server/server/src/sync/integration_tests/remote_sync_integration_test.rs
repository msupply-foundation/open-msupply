use rand::{thread_rng, Rng};
use repository::StorageConnection;

pub trait SyncRecordTester<T> {
    /// inserts new row(s)
    fn insert(&self, connection: &StorageConnection, store_id: &str) -> T;
    /// mutates existing row(s) locally
    fn mutate(&self, connection: &StorageConnection, rows: &T) -> T;
    /// validates that the expected row(s) are in the local DB
    fn validate(&self, connection: &StorageConnection, rows: &T);
}

pub fn gen_i64() -> i64 {
    let mut rng = thread_rng();
    let number: f64 = rng.gen();
    let number = (999999.0 * number) as i64;
    number
}

#[cfg(test)]
mod remote_sync_integration_tests {

    use actix_web::web::Data;
    use repository::{
        mock::MockDataInserts, test_db::setup_all, EqualFilter, StorageConnection, StoreFilter,
        StoreRepository,
    };
    use service::{
        app_data::AppData, service_provider::ServiceProvider, sync_settings::SyncSettings,
    };

    use crate::sync::{
        integration_tests::{
            invoice::InvoiceRecordTester, location::LocationSyncRecordTester,
            name::NameSyncRecordTester, number::NumberSyncRecordTester,
            requisition::RequisitionRecordTester, stock_line::StockLineRecordTester,
            stocktake::StocktakeRecordTester,
        },
        Synchroniser,
    };

    use super::SyncRecordTester;

    #[allow(dead_code)]
    async fn init_db(
        sync_settings: &SyncSettings,
        app_data: &AppData,
        step: &str,
    ) -> (StorageConnection, Synchroniser) {
        let (_, connection, connection_manager, _) = setup_all(
            &format!("remote_sync_integration_{}_tests", step),
            MockDataInserts::none(),
        )
        .await;

        let service_provider = Data::new(ServiceProvider::new(connection_manager.clone()));
        let synchroniser =
            Synchroniser::new(sync_settings.clone(), app_data.clone(), service_provider).unwrap();
        synchroniser
            .central_data
            .pull_and_integrate_records(&connection)
            .await
            .unwrap();

        (connection, synchroniser)
    }

    /// Does a simple test cycle:
    /// 1) Insert new data records and push them to the central server
    /// 2) Reset local data and pull. Then validate that the pulled data is correct
    /// 3) Mutate the previously inserted data and push the changes
    /// 4) Reset, pull and validate as in step 2)
    #[allow(dead_code)]
    async fn test_sync_record<T>(
        sync_settings: &SyncSettings,
        app_data: &AppData,
        tester: &dyn SyncRecordTester<T>,
    ) {
        let (connection, synchroniser) = init_db(sync_settings, app_data, "step0").await;
        synchroniser
            .remote_data
            .initial_pull(&connection)
            .await
            .unwrap();
        let store_id = StoreRepository::new(&connection)
            .query_one(
                StoreFilter::new().site_id(EqualFilter::equal_to_i32(sync_settings.site_id as i32)),
            )
            .unwrap()
            .unwrap()
            .store_row
            .id;

        // push some new changes
        let data = tester.insert(&connection, &store_id);
        synchroniser
            .remote_data
            .push_changes(&connection)
            .await
            .unwrap();

        // reset local DB and pull changes
        let (connection, synchroniser) = init_db(sync_settings, app_data, "step1").await;
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
        let (connection, synchroniser) = init_db(sync_settings, app_data, "step2").await;
        synchroniser
            .remote_data
            .initial_pull(&connection)
            .await
            .unwrap();
        // validate we pulled the same data we inserted
        tester.validate(&connection, &data);
    }

    /// This test assumes a running central server.
    /// To run this test, enable the test macro and update the sync_settings.
    /// For every test run new unique records are generated and it shouldn't be necessary to bring
    /// the central server into a clean state after each test.
    ///
    /// Note: the sub tests can't be parallelized since every sync test need exclusive access to the
    /// central server
    //#[actix_rt::test]
    #[allow(dead_code)]
    async fn test_remote_syncing() {
        let sync_settings = SyncSettings {
            url: "http://192.168.178.77:8080".to_string(),
            username: "mobiletest".to_string(),
            password_sha256: "e2565cf07cd699f745b0e46c8d647f7174fc9446e01a1ffde672a4cf78bf45ac"
                .to_string(),
            interval_sec: 60 * 60,
            central_server_site_id: 1,
            site_id: 7,
            site_hardware_id: "49149896-E713-4535-9DA8-C30AB06F9D5E".to_string(),
        };

        let app_data = AppData {
            site_hardware_id: "49149896-E713-4535-9DA8-C30AB06F9D5E".to_string(),
        };

        println!("number...");
        let number_tester = NumberSyncRecordTester {};
        test_sync_record(&sync_settings, &app_data, &number_tester).await;

        println!("name...");
        let name_tester = NameSyncRecordTester {};
        test_sync_record(&sync_settings, &app_data, &name_tester).await;

        println!("Location...");
        let location_tester = LocationSyncRecordTester {};
        test_sync_record(&sync_settings, &app_data, &location_tester).await;

        println!("stock line...");
        let stock_line_tester = StockLineRecordTester {};
        test_sync_record(&sync_settings, &app_data, &stock_line_tester).await;

        println!("stocktake...");
        let stocktake_tester = StocktakeRecordTester {};
        test_sync_record(&sync_settings, &app_data, &stocktake_tester).await;

        println!("invoice...");
        let invoice_tester = InvoiceRecordTester {};
        test_sync_record(&sync_settings, &app_data, &invoice_tester).await;

        println!("requisition...");
        let requisition_tester = RequisitionRecordTester {};
        test_sync_record(&sync_settings, &app_data, &requisition_tester).await;
    }
}
