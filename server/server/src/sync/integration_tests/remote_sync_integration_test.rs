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

    use repository::{mock::MockDataInserts, test_db::setup_all, StorageConnection};

    use crate::{
        settings::SyncSettings,
        sync::{
            integration_tests::{
                invoice::InvoiceRecordTester, name_store_join::NameStoreJoinRecordTester,
                number::NumberSyncRecordTester, stock_line::StockLineRecordTester,
                stocktake::StocktakeRecordTester,
            },
            Synchroniser,
        },
    };

    use super::SyncRecordTester;

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
    // #[actix_rt::test]
    async fn test_syncing_new_data() {
        let sync_settings = SyncSettings {
            url: "http://192.168.178.77:8080".to_string(),
            username: "mobiletest".to_string(),
            password: "mobiletest".to_string(),
            interval: 60 * 60,
            central_server_site_id: 1,
            site_id: 7,
            site_hardware_id: "49149896-E713-4535-9DA8-C30AB06F9D5E".to_string(),
        };
        let store_id = "80004C94067A4CE5A34FC343EB1B4306";

        // numbers
        let number_tester = NumberSyncRecordTester {};
        test_sync_record(store_id, &sync_settings, &number_tester).await;

        // stock line
        let stock_line_tester = StockLineRecordTester {};
        test_sync_record(store_id, &sync_settings, &stock_line_tester).await;

        let name_store_join_tester = NameStoreJoinRecordTester {};
        test_sync_record(store_id, &sync_settings, &name_store_join_tester).await;

        let stocktake_tester = StocktakeRecordTester {};
        test_sync_record(store_id, &sync_settings, &stocktake_tester).await;

        let invoice_tester = InvoiceRecordTester {};
        test_sync_record(store_id, &sync_settings, &invoice_tester).await;
    }
}
