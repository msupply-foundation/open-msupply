use actix_web::web::Data;
use rand::{thread_rng, Rng};
use repository::{mock::MockDataInserts, test_db::setup_all, StorageConnection};
use serde_json::json;

use crate::{
    service_provider::ServiceProvider,
    sync::{
        settings::SyncSettings,
        synchroniser::Synchroniser,
        test::integration::central_server_configurations::{
            ConfigureCentralServer, CreateSyncSiteResult,
        },
    },
};

use super::central_server_configurations::NewSiteProperties;

pub(crate) trait SyncRecordTester<T> {
    // Extra data that's needed for test to work, i.e. invoice for stocktake inventory adjustment
    fn extra_data(&self, _: &NewSiteProperties) -> serde_json::Value {
        json!({})
    }
    /// inserts new row(s)
    fn insert(&self, connection: &StorageConnection, store_id: &NewSiteProperties) -> T;
    /// mutates existing row(s) locally
    fn mutate(&self, connection: &StorageConnection, store_id: &NewSiteProperties, rows: &T) -> T;
    /// validates that the expected row(s) are in the local DB
    fn validate(&self, connection: &StorageConnection, rows: &T);
}

pub fn gen_i64() -> i64 {
    let mut rng = thread_rng();
    let number: f64 = rng.gen();
    let number = (999999.0 * number) as i64;
    number
}

async fn init_db(sync_settings: &SyncSettings, step: &str) -> (StorageConnection, Synchroniser) {
    let (_, connection, connection_manager, _) = setup_all(
        &format!("remote_sync_integration_{}_tests", step),
        MockDataInserts::none(),
    )
    .await;

    let service_provider = Data::new(ServiceProvider::new(connection_manager.clone(), "app_data"));
    let synchroniser = Synchroniser::new(sync_settings.clone(), service_provider).unwrap();
    synchroniser.sync().await.unwrap();

    (connection, synchroniser)
}

/// Does a simple test cycle:
/// 1) Insert new data records and push them to the central server
/// 2) Reset local data and pull. Then validate that the pulled data is correct
/// 3) Mutate the previously inserted data and push the changes
/// 4) Reset, pull and validate as in step 2)

async fn test_sync_record<T>(identifier: &str, tester: &dyn SyncRecordTester<T>) {
    let CreateSyncSiteResult {
        new_site_properties,
        sync_settings,
    } = ConfigureCentralServer::from_env()
        .create_sync_site_with_extra_data(|pre_site_creation_data| {
            tester.extra_data(pre_site_creation_data)
        })
        .await
        .expect("Problem creating sync site");

    let test_step = format!("test_sync_record_{}_step1", identifier);
    println!("{}", test_step);
    let (connection, synchroniser) = init_db(&sync_settings, &test_step).await;
    synchroniser.sync().await.unwrap();

    // push some new changes
    let data = tester.insert(&connection, &new_site_properties);
    synchroniser.sync().await.unwrap();

    // reset local DB and pull changes
    let test_step = format!("test_sync_record_{}_step2", identifier);
    println!("{}", test_step);
    let (connection, synchroniser) = init_db(&sync_settings, &test_step).await;
    synchroniser.sync().await.unwrap();
    // validate we pulled the same data we inserted
    tester.validate(&connection, &data);

    // mutate changes
    let data = tester.mutate(&connection, &new_site_properties, &data);
    synchroniser.sync().await.unwrap();
    // reset local DB and pull changes
    let test_step = format!("test_sync_record_{}_step3", identifier);
    println!("{}", test_step);
    let (connection, synchroniser) = init_db(&sync_settings, &test_step).await;
    synchroniser.sync().await.unwrap();
    // validate we pulled the same data we inserted
    tester.validate(&connection, &data);
}

// To run this test, you'll need to run central server with a data file with at least one sync site, credentials for which need to be
// passed through with enviromental variable (TODO specify which branch)

// SYNC_SITE_PASSWORD="pass" SYNC_SITE_ID="2" SYNC_SITE_NAME="demo" SYNC_URL="http://localhost:2048" NEW_SITE_PASSWORD="pass" cargo test sync_integration_test  --features integration_test

// OR in VSCODE settings if using rust analyzer (and Run Tests|Debug actions as inlay hints):
// "rust-analyzer.runnableEnv": { "SYNC_URL": "http://localhost:2048", "SYNC_SITE_NAME": "demo","SYNC_SITE_PASSWORD": "pass", "NEW_SITE_PASSWORD": "pass"}
// "rust-analyzer.cargo.features": ["integration_test"]

#[cfg(test)]
mod tests {
    use crate::sync::test::integration::{
        invoice::InvoiceRecordTester, location::LocationSyncRecordTester,
        number::NumberSyncRecordTester, remote_sync_integration_test::test_sync_record,
        requisition::RequisitionRecordTester, stock_line::StockLineRecordTester,
        stocktake::StocktakeRecordTester,
    };

    #[actix_rt::test]
    async fn integration_test_remote_syncing_number() {
        let number_tester = NumberSyncRecordTester {};
        test_sync_record("number", &number_tester).await;
    }

    #[actix_rt::test]
    async fn integration_test_remote_syncing_location() {
        let location_tester = LocationSyncRecordTester {};
        test_sync_record("location", &location_tester).await;
    }

    #[actix_rt::test]
    async fn integration_test_remote_syncing_stock_line() {
        let stock_line_tester = StockLineRecordTester {};
        test_sync_record("stock_line", &stock_line_tester).await;
    }

    #[actix_rt::test]
    async fn integration_test_remote_syncing_stocktake() {
        let stocktake_tester = StocktakeRecordTester::new();
        test_sync_record("stocktake", &stocktake_tester).await;
    }

    #[actix_rt::test]
    async fn integration_test_remote_syncing_invoice() {
        let invoice_tester = InvoiceRecordTester::new();
        test_sync_record("invoice", &invoice_tester).await;
    }

    #[actix_rt::test]
    async fn integration_test_remote_syncing_requisition() {
        let requisition_tester = RequisitionRecordTester::new();
        test_sync_record("requisition", &requisition_tester).await;
    }
}
